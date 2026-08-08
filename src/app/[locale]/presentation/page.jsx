'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { BRAND_LOGO_SRC } from '@/lib/brand';
import {
	ArrowRight,
	ArrowUpRight,
	Bot,
	Calendar,
	Check,
	ChevronDown,
	ClipboardList,
	CreditCard,
	Dumbbell,
	Globe2,
	LayoutDashboard,
	Loader2,
	MessageCircle,
	Phone,
	Search,
	Shield,
	Smartphone,
	Sparkles,
	Target,
	Users,
	Utensils,
	Wallet,
	Zap,
} from 'lucide-react';
import api from '@/utils/axios';
import { useTheme } from '@/app/[locale]/theme';
import AppScreensSlider from './Appscreensslider';
import DesktopScreensSlider from './Desktopscreensslider';
import {
	AI_GROWTH,
	BENEFITS,
	CLOSING,
	DEMO,
	FAQ,
	FEATURE_GROUPS,
	HERO,
	JOURNEY,
	MOBILE,
	NAV_LINKS,
	PROBLEMS,
	ROLES,
	SECURITY,
	WHATSAPP,
} from './content';

const PRES_CSS = `
.presentation-sales{
  --pres-bg:#ffffff;
  --pres-bg-soft:color-mix(in srgb, var(--color-primary-50, #eff6ff) 85%, #f8fafc);
  --pres-bg-tint:var(--color-primary-50, #eff6ff);
  --pres-ink:#0f172a;
  --pres-muted:#475569;
  --pres-border:color-mix(in srgb, var(--color-primary-200, #bfdbfe) 65%, #e2e8f0);
  --pres-accent:var(--color-primary-600, #2563eb);
  --pres-accent-strong:var(--color-primary-700, #1d4ed8);
  --pres-grad:linear-gradient(135deg, var(--color-gradient-from, #3b82f6), var(--color-gradient-via, #2563eb), var(--color-gradient-to, #1d4ed8));
  scroll-behavior:smooth;
  background:var(--pres-bg);
  color:var(--pres-ink);
}
.presentation-sales [data-reveal]{opacity:0;transform:translateY(18px);transition:opacity .7s cubic-bezier(.22,1,.36,1),transform .7s cubic-bezier(.22,1,.36,1)}
.presentation-sales [data-reveal].is-in{opacity:1;transform:none}
.presentation-sales ::-webkit-scrollbar{width:5px}
.presentation-sales ::-webkit-scrollbar-thumb{background:var(--pres-accent);border-radius:4px}
.pres-kicker{color:var(--pres-accent-strong);letter-spacing:.22em;text-transform:uppercase;font-weight:700;font-size:11px}
.pres-btn{
  background:var(--pres-grad);
  color:#fff;
  box-shadow:0 10px 28px color-mix(in srgb, var(--color-primary-600, #2563eb) 28%, transparent);
}
.pres-btn:hover{filter:brightness(1.05)}
.pres-btn-ghost{
  border:1px solid var(--pres-border);
  background:#fff;
  color:var(--pres-ink);
}
.pres-btn-ghost:hover{background:var(--pres-bg-soft)}
.pres-chip{
  border:1px solid var(--pres-border);
  background:color-mix(in srgb, var(--color-primary-50, #eff6ff) 80%, #fff);
  color:var(--pres-accent-strong);
}
.pres-icon{
  background:var(--pres-grad);
  color:#fff;
}
.pres-icon-soft{
  background:color-mix(in srgb, var(--color-primary-100, #dbeafe) 90%, #fff);
  color:var(--pres-accent-strong);
  border:1px solid var(--pres-border);
}
.pres-card{
  background:#fff;
  border:1px solid var(--pres-border);
  box-shadow:0 8px 28px rgba(15,23,42,.04);
}
.pres-check{color:var(--pres-accent)}
.pres-accent-bar{border-inline-start:3px solid var(--pres-accent)}
.pres-grad-text{
  background:var(--pres-grad);
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
}
`;

/* ── helpers ── */
function useLang() {
	const locale = useLocale();
	const isAr = locale !== 'en';
	const pick = (ar, en) => (isAr ? ar : en);
	return { isAr, pick, locale };
}

function useReveal() {
	useEffect(() => {
		const els = document.querySelectorAll('[data-reveal]');
		const io = new IntersectionObserver(
			(entries) => {
				entries.forEach((e) => {
					if (e.isIntersecting) e.target.classList.add('is-in');
				});
			},
			{ threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
		);
		els.forEach((el) => io.observe(el));
		return () => io.disconnect();
	}, []);
}

const Wrap = ({ children, className = '' }) => (
	<div className={`relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
);

function SectionHead({ kicker, title, desc }) {
	return (
		<div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14" data-reveal>
			{kicker && <p className="pres-kicker mb-3">{kicker}</p>}
			<h2 className="font-[family-name:var(--font-arabic)] text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
				{title}
			</h2>
			{desc && <p className="mx-auto mt-4 text-sm leading-7 text-slate-600 sm:text-base">{desc}</p>}
		</div>
	);
}

/* ── Nav ── */
function PresentationNav({ pick, isAr }) {
	const [scrolled, setScrolled] = useState(false);
	const router = useRouter();
	const pathname = usePathname();

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 24);
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, []);

	const switchLocale = () => {
		const next = isAr ? 'en' : 'ar';
		const segs = (pathname || '/').split('/').filter(Boolean);
		if (segs[0] === 'en' || segs[0] === 'ar') segs[0] = next;
		else segs.unshift(next);
		document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
		document.documentElement.lang = next;
		document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
		router.replace('/' + segs.join('/'));
		router.refresh();
	};

	return (
		<header
			className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${
				scrolled ? 'border-[var(--pres-border)] bg-white/95 shadow-sm backdrop-blur-md' : 'border-transparent bg-white/80 backdrop-blur-sm'
			}`}
		>
			<Wrap className="flex h-14 items-center justify-between gap-4 sm:h-16">
				<a href="#top" className="flex items-center gap-2.5">
					<Image src={BRAND_LOGO_SRC} alt="So7baFit" width={32} height={32} className="h-8 w-8 object-contain" />
					<span className="text-base font-black tracking-tight text-slate-900">So7baFit</span>
				</a>
				<nav className="hidden items-center gap-1 lg:flex">
					{NAV_LINKS.map((l) => (
						<a
							key={l.href}
							href={l.href}
							className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-[var(--pres-bg-soft)] hover:text-slate-900"
						>
							{pick(l.ar, l.en)}
						</a>
					))}
				</nav>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={switchLocale}
						aria-label={isAr ? 'Switch to English' : 'التبديل إلى العربية'}
						className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--pres-border)] bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-[var(--pres-bg-soft)]"
					>
						<Globe2 className="h-3.5 w-3.5" />
						{isAr ? 'EN' : 'عربي'}
					</button>
					<a href="#demo" className="pres-btn inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition">
						{pick('احجز عرضًا', 'Book demo')}
						{isAr ? <ArrowRight className="h-3.5 w-3.5 rotate-180" /> : <ArrowRight className="h-3.5 w-3.5" />}
					</a>
				</div>
			</Wrap>
		</header>
	);
}

const DEMO_WHATSAPP = '201551495772'; // 01551495772 (Egypt)

function buildWhatsAppDemoUrl({ name, email, phone, business, message, isAr }) {
	const lines = isAr
		? [
				'طلب عرض تجريبي — So7baFit',
				`الاسم: ${name}`,
				`البريد: ${email}`,
				`الجوال: ${phone}`,
				`النشاط: ${business}`,
				message ? `ملاحظات: ${message}` : null,
			]
		: [
				'So7baFit demo request',
				`Name: ${name}`,
				`Email: ${email}`,
				`Phone: ${phone}`,
				`Business: ${business}`,
				message ? `Notes: ${message}` : null,
			];
	const text = lines.filter(Boolean).join('\n');
	return `https://wa.me/${DEMO_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

/* ── Hero — light split layout ── */
function Hero({ pick, isAr }) {
	const stats = [
		{ n: '3', label: pick('أدوار رئيسية', 'Core roles'), sub: 'Admin / Coach / Client' },
		{ n: 'Web+', label: pick('لوحة + جوال', 'Web + mobile'), sub: pick('تشغيل يومي', 'Daily ops') },
		{ n: 'WA', label: pick('واتساب CRM', 'WhatsApp CRM'), sub: pick('داخل المنصة', 'In-product') },
	];

	return (
		<section id="top" className="relative overflow-hidden bg-[var(--pres-bg)] pb-16 pt-24 sm:pb-20 sm:pt-28">
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0"
				style={{
					background:
						'radial-gradient(ellipse 70% 50% at 85% 10%, color-mix(in srgb, var(--color-primary-200, #bfdbfe) 55%, transparent), transparent 60%), radial-gradient(ellipse 50% 40% at 0% 90%, color-mix(in srgb, var(--color-secondary-100, #e0f2fe) 70%, transparent), transparent 55%)',
				}}
			/>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 opacity-50"
				style={{
					backgroundImage:
						'linear-gradient(color-mix(in srgb, var(--color-primary-200, #bfdbfe) 35%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--color-primary-200, #bfdbfe) 35%, transparent) 1px, transparent 1px)',
					backgroundSize: '56px 56px',
					maskImage: 'radial-gradient(ellipse at center, black 15%, transparent 75%)',
				}}
			/>

			<Wrap className="relative">
				<div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
					<div className="relative z-10 min-w-0">
						<p className="pres-chip mb-4 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-bold" data-reveal>
							<Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--pres-accent)' }} />
							{pick(HERO.eyebrowAr, HERO.eyebrowEn)}
						</p>
						<h1
							className="mb-3 font-[family-name:var(--font-arabic)] text-[clamp(2.2rem,6vw,3.75rem)] font-black leading-[1.08] tracking-tight text-slate-900"
							data-reveal
						>
							<span className="pres-grad-text">{HERO.brand}</span>
						</h1>
						<p className="mb-4 text-lg font-semibold leading-snug text-slate-800 sm:text-xl" data-reveal>
							{pick(HERO.titleAr, HERO.titleEn)}
						</p>
						<p className="mb-7 max-w-lg text-sm leading-7 text-slate-600 sm:text-base" data-reveal>
							{pick(HERO.subAr, HERO.subEn)}
						</p>
						<div className="mb-7 flex flex-wrap gap-3" data-reveal>
							<a href="#demo" className="pres-btn inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition">
								{pick(HERO.ctaPrimaryAr, HERO.ctaPrimaryEn)}
								{isAr ? <ArrowUpRight className="h-4 w-4 -scale-x-100" /> : <ArrowUpRight className="h-4 w-4" />}
							</a>
							<a href="#features" className="pres-btn-ghost inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition">
								{pick(HERO.ctaSecondaryAr, HERO.ctaSecondaryEn)}
							</a>
						</div>
						<div className="flex flex-wrap gap-2" data-reveal>
							{(isAr ? HERO.pillsAr : HERO.pillsEn).map((p) => (
								<span key={p} className="pres-chip rounded-lg px-3 py-1.5 text-[11px] font-semibold">
									{p}
								</span>
							))}
						</div>
					</div>

					<div className="relative z-10 min-w-0" data-reveal>
						<div className="pres-card overflow-hidden rounded-2xl">
							<div className="flex items-center gap-2 border-b border-[var(--pres-border)] bg-[var(--pres-bg-soft)] px-4 py-3">
								<span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
								<span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
								<span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
								<span className="ms-2 truncate rounded-md bg-white px-3 py-1 text-[10px] text-slate-500" dir="ltr">
									so7bafit.com/dashboard
								</span>
							</div>
							<div className="relative aspect-[16/10] w-full bg-slate-100">
								<Image
									src="/screens/web/dashboard.png"
									alt="So7baFit dashboard"
									fill
									priority
									sizes="(max-width: 1024px) 100vw, 50vw"
									className="object-cover object-top"
								/>
							</div>
						</div>

						<div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
							{stats.map((s) => (
								<div key={s.label} className="pres-card rounded-xl px-2 py-3 text-center sm:px-3">
									<div className="pres-grad-text font-[family-name:var(--font-arabic)] text-xl font-black sm:text-2xl">{s.n}</div>
									<div className="mt-0.5 text-[10px] font-semibold text-slate-700 sm:text-xs">{s.label}</div>
									<div className="mt-0.5 hidden text-[9px] text-slate-500 sm:block">{s.sub}</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</Wrap>
		</section>
	);
}

/* ── Problems ── */
function Problems({ pick }) {
	return (
		<section id="problems" className="relative bg-[var(--pres-bg-soft)] py-16 sm:py-24">
			<Wrap>
				<SectionHead
					kicker={pick('01 — المشكلة', '01 — Problem')}
					title={pick('لماذا يتعثر عمل التدريب بدون نظام؟', 'Why coaching businesses stall without a system')}
					desc={pick(
						'الأدوات اليومية ليست مصممة لإدارة عملاء، خطط، ودفعات معًا.',
						'Everyday tools were never built to run clients, plans, and payments together.'
					)}
				/>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{PROBLEMS.map((item, i) => {
						const c = pick(item.ar, item.en);
						return (
							<div
								key={c.t}
								data-reveal
								style={{ transitionDelay: `${i * 60}ms` }}
								className="pres-card pres-accent-bar rounded-2xl px-5 py-5"
							>
								<h3 className="mb-2 text-sm font-extrabold text-slate-900">{c.t}</h3>
								<p className="text-xs leading-6 text-slate-600 sm:text-sm sm:leading-7">{c.d}</p>
							</div>
						);
					})}
				</div>
			</Wrap>
		</section>
	);
}

/* ── Why ── */
function WhyChoose({ pick }) {
	const icons = [LayoutDashboard, MessageCircle, Smartphone, Globe2];
	return (
		<section id="why" className="relative bg-white py-16 sm:py-24">
			<Wrap>
				<SectionHead
					kicker={pick('02 — لماذا So7baFit', '02 — Why So7baFit')}
					title={pick('أفضل من واتساب + إكسل + PDF', 'Better than WhatsApp + Excel + PDFs')}
					desc={pick(
						'منصة واحدة تربط التشغيل اليومي بنتائج قابلة للقياس.',
						'One platform that connects daily ops to measurable results.'
					)}
				/>
				<div className="grid gap-6 sm:grid-cols-2">
					{BENEFITS.map((b, i) => {
						const Icon = icons[i];
						const c = pick(b.ar, b.en);
						return (
							<div key={c.t} data-reveal className="pres-card flex gap-4 rounded-2xl p-5 sm:p-6">
								<div className="pres-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
									<Icon className="h-5 w-5" />
								</div>
								<div>
									<h3 className="mb-1.5 text-base font-extrabold text-slate-900">{c.t}</h3>
									<p className="text-sm leading-7 text-slate-600">{c.d}</p>
								</div>
							</div>
						);
					})}
				</div>
			</Wrap>
		</section>
	);
}

const GROUP_ICONS = {
	coaching: Dumbbell,
	nutrition: Utensils,
	clients: Users,
	ops: Calendar,
	billing: CreditCard,
	platform: Shield,
};

function Features({ pick }) {
	return (
		<section id="features" className="relative bg-[var(--pres-bg-soft)] py-16 sm:py-24">
			<Wrap>
				<SectionHead
					kicker={pick('03 — المميزات', '03 — Features')}
					title={pick('كل ما هو مُنفَّذ فعليًا في المنصة', 'What is actually built in the product')}
					desc={pick(
						'محتوى مبني على الكود الحالي — بدون افتراضات تسويقية.',
						'Content mapped from the live codebase — no assumed features.'
					)}
				/>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{FEATURE_GROUPS.map((g, i) => {
						const Icon = GROUP_ICONS[g.id] || Zap;
						const head = pick(g.ar, g.en);
						return (
							<article
								key={g.id}
								data-reveal
								style={{ transitionDelay: `${i * 40}ms` }}
								className="pres-card rounded-2xl p-5 sm:p-6"
							>
								<div className="mb-4 flex items-center gap-3">
									<div className="pres-icon-soft flex h-10 w-10 items-center justify-center rounded-xl">
										<Icon className="h-5 w-5" />
									</div>
									<div>
										<h3 className="text-sm font-extrabold text-slate-900 sm:text-base">{head.title}</h3>
										<p className="text-[11px] text-slate-500 sm:text-xs">{head.desc}</p>
									</div>
								</div>
								<ul className="space-y-2.5">
									{g.items.map((it) => (
										<li key={it.en} className="flex items-start gap-2 text-sm text-slate-700">
											<Check className="pres-check mt-0.5 h-4 w-4 shrink-0" />
											<span>{pick(it.ar, it.en)}</span>
										</li>
									))}
								</ul>
							</article>
						);
					})}
				</div>
			</Wrap>
		</section>
	);
}

/* ── WhatsApp ── */
function WhatsAppSection({ pick }) {
	const c = pick(WHATSAPP.ar, WHATSAPP.en);
	return (
		<section id="whatsapp" className="relative bg-white py-16 sm:py-24">
			<Wrap>
				<div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
					<div data-reveal>
						<p className="pres-kicker mb-3">{pick('04 — واتساب CRM', '04 — WhatsApp CRM')}</p>
						<h2 className="mb-4 font-[family-name:var(--font-arabic)] text-2xl font-extrabold text-slate-900 sm:text-3xl">
							{c.title}
						</h2>
						<p className="mb-6 text-sm leading-7 text-slate-600 sm:text-base">{c.desc}</p>
						<ul className="space-y-4">
							{c.points.map((p) => (
								<li key={p.t} className="flex gap-3">
									<span className="pres-icon mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
										<Check className="h-3.5 w-3.5" />
									</span>
									<div>
										<p className="text-sm font-bold text-slate-900">{p.t}</p>
										<p className="text-xs leading-6 text-slate-600 sm:text-sm">{p.d}</p>
									</div>
								</li>
							))}
						</ul>
					</div>
					<div data-reveal className="pres-card relative overflow-hidden rounded-3xl p-6 sm:p-8">
						<div className="mb-6 flex items-center gap-3">
							<div className="pres-icon flex h-12 w-12 items-center justify-center rounded-2xl">
								<MessageCircle className="h-6 w-6" />
							</div>
							<div>
								<p className="text-sm font-bold text-slate-900">{pick('مساحة واتساب', 'WhatsApp workspace')}</p>
								<p className="text-xs text-slate-500">WPPConnect + Meta Cloud API</p>
							</div>
						</div>
						<div className="space-y-3">
							{[
								{ ar: 'صندوق الوارد', en: 'Inbox' },
								{ ar: 'إسناد الفريق', en: 'Assignment' },
								{ ar: 'اقتراحات ذكية', en: 'AI suggestions' },
								{ ar: 'القوالب', en: 'Templates' },
							].map((row) => (
								<div
									key={row.en}
									className="flex items-center justify-between rounded-xl border border-[var(--pres-border)] bg-[var(--pres-bg-soft)] px-4 py-3"
								>
									<span className="text-xs font-semibold text-slate-700">{pick(row.ar, row.en)}</span>
									<span className="h-2 w-2 rounded-full" style={{ background: 'var(--pres-accent)' }} />
								</div>
							))}
						</div>
						<p className="mt-6 text-[11px] leading-5 text-slate-500">
							{pick(
								'متاح على الويب: /dashboard/whatsapp و /dashboard/meta-whatsapp',
								'Available on web: /dashboard/whatsapp & /dashboard/meta-whatsapp'
							)}
						</p>
					</div>
				</div>
			</Wrap>
		</section>
	);
}

/* ── AI & growth ── */
function AiGrowth({ pick }) {
	const c = pick(AI_GROWTH.ar, AI_GROWTH.en);
	const icons = [Bot, MessageCircle, Utensils, Search, Phone, ClipboardList];
	return (
		<section id="ai" className="relative bg-[var(--pres-bg-soft)] py-16 sm:py-24">
			<Wrap>
				<SectionHead kicker={pick('05 — ذكاء ونمو', '05 — AI & growth')} title={c.title} desc={c.desc} />
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{c.items.map((item, i) => {
						const Icon = icons[i] || Sparkles;
						return (
							<div key={item.t} data-reveal className="pres-card rounded-2xl p-5">
								<div className="pres-icon-soft mb-3 flex h-9 w-9 items-center justify-center rounded-lg">
									<Icon className="h-4 w-4" />
								</div>
								<h3 className="mb-1 text-sm font-extrabold text-slate-900">{item.t}</h3>
								<p className="text-xs leading-6 text-slate-600 sm:text-sm sm:leading-7">{item.d}</p>
							</div>
						);
					})}
				</div>
			</Wrap>
		</section>
	);
}

/* ── Roles ── */
function Roles({ pick }) {
	return (
		<section id="roles" className="relative bg-white py-16 sm:py-24">
			<Wrap>
				<SectionHead
					kicker={pick('06 — الأدوار', '06 — Roles')}
					title={pick('ثلاثة أدوار — منصة واحدة', 'Three roles — one platform')}
					desc={pick(
						'كل دور يحصل على واجهة وصلاحيات مناسبة.',
						'Each role gets the right interface and permissions.'
					)}
				/>
				<div className="grid gap-4 lg:grid-cols-3">
					{ROLES.map((r, i) => {
						const c = pick(r.ar, r.en);
						return (
							<article
								key={r.key}
								data-reveal
								style={{ transitionDelay: `${i * 50}ms` }}
								className="pres-card rounded-2xl p-6"
							>
								<p className="pres-kicker mb-1">{c.sub}</p>
								<h3 className="mb-2 text-xl font-extrabold text-slate-900">{c.title}</h3>
								<p className="mb-5 text-sm leading-7 text-slate-600">{c.d}</p>
								<ul className="space-y-2">
									{c.features.map((f) => (
										<li key={f} className="flex items-center gap-2 text-sm text-slate-700">
											<Check className="pres-check h-3.5 w-3.5" />
											{f}
										</li>
									))}
								</ul>
							</article>
						);
					})}
				</div>
			</Wrap>
		</section>
	);
}

/* ── Journey ── */
function Journey({ pick }) {
	return (
		<section id="journey" className="relative bg-[var(--pres-bg-soft)] py-16 sm:py-24">
			<Wrap>
				<SectionHead
					kicker={pick('07 — رحلة العميل', '07 — Client journey')}
					title={pick('من أول استبيان حتى النتائج', 'From first intake to results')}
					desc={pick('دورة عمل قصيرة وواضحة يفهمها الفريق بسرعة.', 'A short, clear loop your team can run every week.')}
				/>
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
					{JOURNEY.map((step, i) => {
						const c = pick(step.ar, step.en);
						return (
							<div key={c.t} data-reveal className="pres-card rounded-2xl p-4 sm:p-5">
								<span className="pres-icon mb-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black">
									{i + 1}
								</span>
								<h3 className="mb-1 text-sm font-extrabold text-slate-900">{c.t}</h3>
								<p className="text-[11px] leading-5 text-slate-600 sm:text-xs sm:leading-6">{c.d}</p>
							</div>
						);
					})}
				</div>
			</Wrap>
		</section>
	);
}

/* ── Mobile ── */
function MobileSection({ pick }) {
	const c = pick(MOBILE.ar, MOBILE.en);
	return (
		<section id="mobile" className="relative bg-white py-16 sm:py-20">
			<Wrap>
				<div className="mb-10 grid items-end gap-6 lg:grid-cols-[1.1fr_0.9fr]">
					<div data-reveal>
						<p className="pres-kicker mb-3">{pick('08 — الجوال', '08 — Mobile')}</p>
						<h2 className="mb-3 text-2xl font-extrabold text-slate-900 sm:text-3xl">{c.title}</h2>
						<p className="mb-3 text-sm leading-7 text-slate-600 sm:text-base">{c.desc}</p>
						<p className="text-xs font-semibold" style={{ color: 'var(--pres-accent-strong)' }}>
							{c.note}
						</p>
					</div>
					<div data-reveal className="flex flex-wrap gap-2">
						{c.items.map((item) => (
							<span key={item} className="pres-chip rounded-lg px-3 py-1.5 text-[11px] font-semibold">
								{item}
							</span>
						))}
					</div>
				</div>
			</Wrap>
			<div id="platform">
				<AppScreensSlider />
				<DesktopScreensSlider />
			</div>
		</section>
	);
}

/* ── Security ── */
function SecuritySection({ pick }) {
	const c = pick(SECURITY.ar, SECURITY.en);
	return (
		<section id="security" className="relative bg-[var(--pres-bg-soft)] py-16 sm:py-20">
			<Wrap>
				<SectionHead kicker={pick('09 — الثقة', '09 — Trust')} title={c.title} desc={c.desc} />
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{c.items.map((item) => (
						<div key={item.t} data-reveal className="pres-card rounded-2xl p-5">
							<Shield className="pres-check mb-3 h-5 w-5" />
							<h3 className="mb-1 text-sm font-bold text-slate-900">{item.t}</h3>
							<p className="text-xs leading-6 text-slate-600">{item.d}</p>
						</div>
					))}
				</div>
			</Wrap>
		</section>
	);
}

/* ── FAQ ── */
function FaqSection({ pick }) {
	const [open, setOpen] = useState(0);
	return (
		<section id="faq" className="relative bg-[#f4f6f8] py-16 sm:py-24">
			<Wrap className="max-w-3xl">
				<SectionHead
					kicker={pick('10 — أسئلة شائعة', '10 — FAQ')}
					title={pick('إجابات مباشرة قبل الحجز', 'Straight answers before you book')}
				/>
				<div className="space-y-2">
					{FAQ.map((item, i) => {
						const c = pick(item.ar, item.en);
						const isOpen = open === i;
						return (
							<div key={c.q} className="overflow-hidden rounded-xl border border-slate-200 bg-white" data-reveal>
								<button
									type="button"
									onClick={() => setOpen(isOpen ? -1 : i)}
									className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start"
								>
									<span className="text-sm font-bold text-slate-900 sm:text-base">{c.q}</span>
									<ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition ${isOpen ? 'rotate-180' : ''}`} />
								</button>
								{isOpen && <p className="border-t border-slate-100 px-5 py-4 text-sm leading-7 text-slate-600">{c.a}</p>}
							</div>
						);
					})}
				</div>
			</Wrap>
		</section>
	);
}

/* ── Demo CTA — opens WhatsApp 01551495772 with form data ── */
function DemoSection({ pick, isAr }) {
	const c = pick(DEMO.ar, DEMO.en);
	const [submitted, setSubmitted] = useState(false);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [form, setForm] = useState({ name: '', email: '', phone: '', business: 'gym', message: '' });

	const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

	const onSubmit = async (e) => {
		e.preventDefault();
		setError('');
		setLoading(true);
		try {
			const bizLabel = c.businessOptions.find((o) => o.id === form.business)?.label || form.business;
			const waUrl = buildWhatsAppDemoUrl({
				name: form.name,
				email: form.email,
				phone: form.phone,
				business: bizLabel,
				message: form.message,
				isAr,
			});

			// Best-effort CRM log — WhatsApp is the primary handoff
			try {
				await api.post('/feedback', {
					type: 'other',
					name: form.name,
					title: `Presentation Demo – ${form.name}`.trim(),
					description: [
						`Source: /presentation`,
						`WhatsApp: ${DEMO_WHATSAPP}`,
						`${c.fields.name}: ${form.name}`,
						`${c.fields.email}: ${form.email}`,
						`${c.fields.phone}: ${form.phone}`,
						`${c.fields.business}: ${bizLabel}`,
						form.message ? `${c.fields.message}: ${form.message}` : null,
					]
						.filter(Boolean)
						.join('\n'),
					email: form.email,
					phone: form.phone,
					category: 'contact',
				});
			} catch {
				/* ignore — still open WhatsApp */
			}

			window.open(waUrl, '_blank', 'noopener,noreferrer');
			setSubmitted(true);
		} catch (err) {
			setError(err?.message || (isAr ? 'تعذر فتح واتساب. حاول مرة أخرى.' : 'Could not open WhatsApp. Try again.'));
		} finally {
			setLoading(false);
		}
	};

	const inputCls =
		'w-full rounded-xl border border-[var(--pres-border)] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--pres-accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary-500)_25%,transparent)]';

	return (
		<section id="demo" className="relative bg-[var(--pres-bg-soft)] py-16 sm:py-24">
			<Wrap>
				<div className="pres-card grid gap-0 overflow-hidden rounded-3xl lg:grid-cols-2">
					<div className="bg-[var(--pres-bg-tint)] p-7 sm:p-10" data-reveal>
						<p className="pres-kicker mb-3">{pick('احجز الآن', 'Book now')}</p>
						<h2 className="mb-3 text-2xl font-extrabold text-slate-900 sm:text-3xl">{c.title}</h2>
						<p className="mb-8 text-sm leading-7 text-slate-600">{c.desc}</p>
						<ul className="space-y-3 text-sm text-slate-700">
							{[
								pick('لوحة الإدارة والمؤشرات', 'Admin dashboard & KPIs'),
								pick('تجربة المدرب والخطط', 'Coach plans & follow-up'),
								pick('تطبيق العميل وواتساب', 'Client app & WhatsApp'),
							].map((t) => (
								<li key={t} className="flex items-center gap-2">
									<Target className="pres-check h-4 w-4" />
									{t}
								</li>
							))}
						</ul>
						<div className="mt-10 flex items-center gap-3 text-xs text-slate-500">
							<Wallet className="h-4 w-4" />
							<span>{pick('بدون التزام — جلسة تعريفية قصيرة', 'No commitment — a short intro session')}</span>
						</div>
					</div>

					<div className="bg-white p-7 sm:p-10" data-reveal>
						{submitted ? (
							<div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
								<div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white">
									<Check className="h-7 w-7" />
								</div>
								<p className="mb-4 text-lg font-extrabold text-slate-900">{c.success}</p>
								<a
									href={buildWhatsAppDemoUrl({
										name: form.name,
										email: form.email,
										phone: form.phone,
										business: c.businessOptions.find((o) => o.id === form.business)?.label || form.business,
										message: form.message,
										isAr,
									})}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-bold text-white"
								>
									<MessageCircle className="h-4 w-4" />
									{pick('فتح واتساب مرة أخرى', 'Open WhatsApp again')}
								</a>
							</div>
						) : (
							<form onSubmit={onSubmit} className="space-y-4">
								<div>
									<label className="mb-1.5 block text-xs font-bold text-slate-600">{c.fields.name}</label>
									<input required name="name" value={form.name} onChange={onChange} className={inputCls} />
								</div>
								<div className="grid gap-4 sm:grid-cols-2">
									<div>
										<label className="mb-1.5 block text-xs font-bold text-slate-600">{c.fields.email}</label>
										<input required type="email" name="email" value={form.email} onChange={onChange} className={inputCls} />
									</div>
									<div>
										<label className="mb-1.5 block text-xs font-bold text-slate-600">{c.fields.phone}</label>
										<input required name="phone" value={form.phone} onChange={onChange} className={inputCls} dir="ltr" />
									</div>
								</div>
								<div>
									<label className="mb-1.5 block text-xs font-bold text-slate-600">{c.fields.business}</label>
									<select name="business" value={form.business} onChange={onChange} className={inputCls}>
										{c.businessOptions.map((o) => (
											<option key={o.id} value={o.id}>
												{o.label}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="mb-1.5 block text-xs font-bold text-slate-600">{c.fields.message}</label>
									<textarea name="message" rows={3} value={form.message} onChange={onChange} className={inputCls} />
								</div>
								{error && <p className="text-xs font-semibold text-red-600">{error}</p>}
								<button
									type="submit"
									disabled={loading}
									className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#1ebe57] disabled:opacity-60"
								>
									{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
									{c.submit}
								</button>
								<p className="text-center text-[11px] text-slate-500" dir="ltr">
									WhatsApp · 01551495772
								</p>
							</form>
						)}
					</div>
				</div>
			</Wrap>
		</section>
	);
}

/* ── Closing ── */
function Closing({ pick, isAr }) {
	const c = pick(CLOSING.ar, CLOSING.en);
	return (
		<section className="relative overflow-hidden bg-white py-20 sm:py-28">
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0"
				style={{
					background:
						'radial-gradient(ellipse 60% 50% at 50% 0%, color-mix(in srgb, var(--color-primary-200, #bfdbfe) 55%, transparent), transparent 60%)',
				}}
			/>
			<Wrap className="relative text-center">
				<p className="pres-grad-text mb-3 text-sm font-black tracking-wide">So7baFit</p>
				<h2 className="mx-auto mb-4 max-w-2xl text-2xl font-extrabold text-slate-900 sm:text-4xl" data-reveal>
					{c.title}
				</h2>
				<p className="mx-auto mb-8 max-w-xl text-sm leading-7 text-slate-600" data-reveal>
					{c.desc}
				</p>
				<a href="#demo" data-reveal className="pres-btn inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold transition">
					{c.cta}
					{isAr ? <ArrowRight className="h-4 w-4 rotate-180" /> : <ArrowRight className="h-4 w-4" />}
				</a>
				<p className="mt-10 text-[11px] text-slate-500">
					<Link href="/" className="underline-offset-2 hover:underline">
						{pick('العودة للرئيسية', 'Back to home')}
					</Link>
				</p>
			</Wrap>
		</section>
	);
}

/* ── Root ── */
export default function PresentationPage() {
	const { pick, isAr, locale } = useLang();
	const { colors } = useTheme();
	useReveal();

	return (
		<div className="presentation-sales antialiased" dir={isAr ? 'rtl' : 'ltr'} lang={locale}>
			<style dangerouslySetInnerHTML={{ __html: PRES_CSS }} />
			{/* Ensure brand tokens are present even before ThemeProvider finishes mounting */}
			<style
				dangerouslySetInnerHTML={{
					__html: colors
						? `
.presentation-sales{
  --color-primary-50:${colors.primary[50]};
  --color-primary-100:${colors.primary[100]};
  --color-primary-200:${colors.primary[200]};
  --color-primary-500:${colors.primary[500]};
  --color-primary-600:${colors.primary[600]};
  --color-primary-700:${colors.primary[700]};
  --color-secondary-100:${colors.secondary[100]};
  --color-gradient-from:${colors.gradient.from};
  --color-gradient-via:${colors.gradient.via};
  --color-gradient-to:${colors.gradient.to};
}`
						: '',
				}}
			/>
			<PresentationNav pick={pick} isAr={isAr} />
			<Hero pick={pick} isAr={isAr} />
			<Problems pick={pick} />
			<WhyChoose pick={pick} />
			<Features pick={pick} />
			<WhatsAppSection pick={pick} />
			<AiGrowth pick={pick} />
			<Roles pick={pick} />
			<Journey pick={pick} />
			<MobileSection pick={pick} />
			<SecuritySection pick={pick} />
			<FaqSection pick={pick} />
			<DemoSection pick={pick} isAr={isAr} />
			<Closing pick={pick} isAr={isAr} />
		</div>
	);
}
