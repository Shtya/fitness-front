'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect, useRef } from 'react';

// ─────────────────────────────────────────────
// Utility: useInView hook for scroll animations
// ─────────────────────────────────────────────
function useInView(options = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12, ...options },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, inView];
}

// ─────────────────────────────────────────────
// FadeIn wrapper
// ─────────────────────────────────────────────
function FadeIn({ children, delay = 0, className = '' }) {
  const [ref, inView] = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(22px)',
        transition: `opacity 0.65s ease ${delay}s, transform 0.65s ease ${delay}s`,
      }}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function HomePage() {
  const t = useTranslations('landing');
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { key: 'nav.about', href: '#about' },
    { key: 'nav.results', href: '#results' },
    { key: 'nav.programs', href: '#programs' },
    { key: 'nav.faq', href: '#faq' },
  ];

  const audienceCards = [
    { icon: '⟐', titleKey: 'audience.0.title', descKey: 'audience.0.desc' },
    { icon: '⟐', titleKey: 'audience.1.title', descKey: 'audience.1.desc' },
    { icon: '⟐', titleKey: 'audience.2.title', descKey: 'audience.2.desc' },
    { icon: '⟐', titleKey: 'audience.3.title', descKey: 'audience.3.desc' },
  ];

  const features = [
    { titleKey: 'features.0.title', descKey: 'features.0.desc' },
    { titleKey: 'features.1.title', descKey: 'features.1.desc' },
    { titleKey: 'features.2.title', descKey: 'features.2.desc' },
    { titleKey: 'features.3.title', descKey: 'features.3.desc' },
    { titleKey: 'features.4.title', descKey: 'features.4.desc' },
    { titleKey: 'features.5.title', descKey: 'features.5.desc' },
  ];

  const steps = [
    { num: '01', titleKey: 'steps.0.title', descKey: 'steps.0.desc' },
    { num: '02', titleKey: 'steps.1.title', descKey: 'steps.1.desc' },
    { num: '03', titleKey: 'steps.2.title', descKey: 'steps.2.desc' },
    { num: '04', titleKey: 'steps.3.title', descKey: 'steps.3.desc' },
  ];

const results = [
  {
    nameKey: 'results.0.name',
    statKey: 'results.0.stat',
    goalKey: 'results.0.goal',
    quoteKey: 'results.0.quote',
    duration: '12 wks',
    beforeImage: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80',
    afterImage: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80',
   },
  {
    nameKey: 'results.1.name',
    statKey: 'results.1.stat',
    goalKey: 'results.1.goal',
    quoteKey: 'results.1.quote',
    duration: '16 wks',
     beforeImage: 'https://images.unsplash.com/photo-1594737625785-a6cbdabd333c?auto=format&fit=crop&w=800&q=80',
    afterImage: 'https://images.unsplash.com/photo-1594737625785-a6cbdabd333c?auto=format&fit=crop&w=800&q=80',
  },
  {
    nameKey: 'results.2.name',
    statKey: 'results.2.stat',
    goalKey: 'results.2.goal',
    quoteKey: 'results.2.quote',
    duration: '20 wks',
    beforeImage: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=800&q=80',
    afterImage: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=800&q=80',
   },
];

  const whyItems = [
    { titleKey: 'why.0.title', descKey: 'why.0.desc' },
    { titleKey: 'why.1.title', descKey: 'why.1.desc' },
    { titleKey: 'why.2.title', descKey: 'why.2.desc' },
    { titleKey: 'why.3.title', descKey: 'why.3.desc' },
  ];

  const plans = [
    {
      titleKey: 'plans.0.title',
      priceKey: 'plans.0.price',
      periodKey: 'plans.0.period',
      descKey: 'plans.0.desc',
      featuresKeys: ['plans.0.f0', 'plans.0.f1', 'plans.0.f2', 'plans.0.f3'],
      featured: false,
      ctaKey: 'plans.0.cta',
    },
    {
      titleKey: 'plans.1.title',
      priceKey: 'plans.1.price',
      periodKey: 'plans.1.period',
      descKey: 'plans.1.desc',
      featuresKeys: ['plans.1.f0', 'plans.1.f1', 'plans.1.f2', 'plans.1.f3', 'plans.1.f4', 'plans.1.f5'],
      featured: true,
      ctaKey: 'plans.1.cta',
    },
    {
      titleKey: 'plans.2.title',
      priceKey: 'plans.2.price',
      periodKey: 'plans.2.period',
      descKey: 'plans.2.desc',
      featuresKeys: ['plans.2.f0', 'plans.2.f1', 'plans.2.f2', 'plans.2.f3', 'plans.2.f4'],
      featured: false,
      ctaKey: 'plans.2.cta',
    },
  ];

  const testimonials = [
    { nameKey: 'testimonials.0.name', roleKey: 'testimonials.0.role', quoteKey: 'testimonials.0.quote', rating: 5 },
    { nameKey: 'testimonials.1.name', roleKey: 'testimonials.1.role', quoteKey: 'testimonials.1.quote', rating: 5 },
    { nameKey: 'testimonials.2.name', roleKey: 'testimonials.2.role', quoteKey: 'testimonials.2.quote', rating: 5 },
    { nameKey: 'testimonials.3.name', roleKey: 'testimonials.3.role', quoteKey: 'testimonials.3.quote', rating: 5 },
    { nameKey: 'testimonials.4.name', roleKey: 'testimonials.4.role', quoteKey: 'testimonials.4.quote', rating: 5 },
    { nameKey: 'testimonials.5.name', roleKey: 'testimonials.5.role', quoteKey: 'testimonials.5.quote', rating: 5 },
  ];

  const faqs = [
    { qKey: 'faq.0.q', aKey: 'faq.0.a' },
    { qKey: 'faq.1.q', aKey: 'faq.1.a' },
    { qKey: 'faq.2.q', aKey: 'faq.2.a' },
    { qKey: 'faq.3.q', aKey: 'faq.3.a' },
    { qKey: 'faq.4.q', aKey: 'faq.4.a' },
    { qKey: 'faq.5.q', aKey: 'faq.5.a' },
  ];

  return (
    <>
      {/* ── Google Fonts ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=DM+Sans:wght@300;400;500;600&display=swap');

        :root {
          --cream: #f6f5f1;
          --white: #FFFFFF;
          --charcoal: #181818;
          --mid: #3A3A3A;
          --muted: #7A7A7A;
          --gold: #B8975A;
          --gold-light: #D4B07A;
          --sage: #68786A;
          --border: #E4E0D8;
          --border-dark: #2E2E2E;
        }
 

        body {
          font-family: 'DM Sans', sans-serif;
          background: var(--cream);
          color: var(--charcoal);
          -webkit-font-smoothing: antialiased;
        }

        .font-display { font-family: 'Cormorant Garamond', serif; }

        /* Focus states */
        a:focus-visible, button:focus-visible {
          outline: 2px solid var(--gold);
          outline-offset: 3px;
          border-radius: 2px;
        }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: var(--cream); }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }

        /* Section divider */
        .section-line {
          width: 40px;
          height: 2px;
          background: var(--gold);
          display: block;
        }

        /* Premium button base */
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 32px;
          background: var(--charcoal);
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          border: none;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.25s, transform 0.2s;
          position: relative;
          overflow: hidden;
        }
        .btn-primary:hover { background: var(--mid); transform: translateY(-1px); }

        .btn-gold {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 32px;
          background: var(--gold);
          color: var(--charcoal);
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          border: none;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.25s, transform 0.2s;
        }
        .btn-gold:hover { background: var(--gold-light); transform: translateY(-1px); }

        .btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 13px 30px;
          background: transparent;
          color: var(--charcoal);
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          border: 1.5px solid var(--charcoal);
          cursor: pointer;
          text-decoration: none;
          transition: background 0.25s, color 0.25s, transform 0.2s;
        }
        .btn-outline:hover { background: var(--charcoal); color: #fff; transform: translateY(-1px); }

        /* Stat counter animation */
        @keyframes countUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Noise texture overlay for premium feel */
        .noise-overlay {
          position: relative;
        }
        .noise-overlay::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E");
          background-size: 200px;
          pointer-events: none;
          z-index: 1;
        }

        /* Mobile menu transition */
        .mobile-menu {
          transform: translateX(100%);
          transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .mobile-menu.open {
          transform: translateX(0);
        }

        /* Testimonial card hover */
        .testimonial-card {
          transition: transform 0.25s, box-shadow 0.25s;
        }
        .testimonial-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.08);
        }

        /* Plan card hover */
        .plan-card {
          transition: transform 0.25s, box-shadow 0.25s;
        }
        .plan-card:not(.featured):hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.07);
        }

        /* Underline link */
        .link-underline {
          position: relative;
          text-decoration: none;
        }
        .link-underline::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 100%;
          height: 1px;
          background: currentColor;
          transition: right 0.25s ease;
        }
        .link-underline:hover::after { right: 0; }

        /* FAQ */
        .faq-answer {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s;
          opacity: 0;
        }
        .faq-answer.open {
          max-height: 300px;
          opacity: 1;
        }

        /* Gold tag */
        .gold-tag {
          display: inline-block;
          padding: 4px 12px;
          background: var(--gold);
          color: var(--charcoal);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        /* Image placeholder */
        .img-placeholder {
          background: linear-gradient(135deg, #E8E4DC 0%, #D4CFC4 100%);
          position: relative;
          overflow: hidden;
        }
        .img-placeholder::before {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 8px,
            rgba(255,255,255,0.15) 8px,
            rgba(255,255,255,0.15) 9px
          );
        }

        /* Feature number */
        .feature-num {
          font-family: 'Cormorant Garamond', serif;
          font-size: 48px;
          font-weight: 400;
          color: var(--border);
          line-height: 1;
          display: block;
          margin-bottom: 8px;
        }
      `}</style>

      <div style={{ background: 'var(--cream)', minHeight: '100vh' }}>
        {/* ══════════════════════════════════════════
            HEADER
        ══════════════════════════════════════════ */}
        <header
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10000,
            background: scrolled ? 'rgba(249,247,243,0.96)' : 'transparent',
            backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
            borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
            transition: 'background 0.35s, border-color 0.35s, backdrop-filter 0.35s',
          }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', height: 68, gap: 40 }}>
              {/* Logo */}
              <a href='#' aria-label='Home' style={{ textDecoration: 'none', display: 'flex', alignItems: 'baseline', gap: 6, flexShrink: 0 }}>
                <span className='font-display' style={{ fontSize: 22, fontWeight: 600, color: 'var(--charcoal)', letterSpacing: '-0.01em' }}>
                  {t('brand.name')}
                </span>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold)', display: 'inline-block', marginBottom: 4 }} />
              </a>

              {/* Desktop Nav */}
              <nav aria-label='Main navigation' style={{ display: 'flex', gap: 32, marginLeft: 'auto' }} className='hidden-mobile'>
                {navLinks.map(l => (
                  <a key={l.key} href={l.href} className='link-underline' style={{ color: 'var(--mid)', fontSize: 14, fontWeight: 400, letterSpacing: '0.01em', textDecoration: 'none' }}>
                    {t(l.key)}
                  </a>
                ))}
              </nav>

              {/* Locale switcher + CTA */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 24 }} className='hidden-mobile'>
                <a href='/ar' style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none', fontWeight: 500, letterSpacing: '0.02em' }} aria-label='Switch to Arabic'>
                  {t('locale.switch')}
                </a>
                <a href='#programs' className='btn-gold' style={{ padding: '10px 22px', fontSize: 13 }}>
                  {t('header.cta')}
                </a>
              </div>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                style={{ 
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 8,
                  display: 'none',
                  flexDirection: 'column',
                  gap: 5,
                }}
                className='show-mobile rtl:mr-auto ltr:ml-auto  '>
                <span style={{ width: 22, height: 1.5, background: 'var(--charcoal)', display: 'block', transition: 'transform 0.25s', transform: menuOpen ? 'rotate(45deg) translate(4.5px, 4.5px)' : 'none' }} />
                <span style={{ width: 22, height: 1.5, background: 'var(--charcoal)', display: 'block', opacity: menuOpen ? 0 : 1, transition: 'opacity 0.25s' }} />
                <span style={{ width: 22, height: 1.5, background: 'var(--charcoal)', display: 'block', transition: 'transform 0.25s', transform: menuOpen ? 'rotate(-45deg) translate(4.5px, -4.5px)' : 'none' }} />
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          <div
            className={`mobile-menu${menuOpen ? ' open' : ''}`}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(320px, 90vw)',
              background: 'var(--white)',
              padding: '80px 32px 40px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              boxShadow: '-8px 0 40px rgba(0,0,0,0.08)',
            }}
            aria-hidden={!menuOpen}>
            {navLinks.map(l => (
              <a key={l.key} href={l.href} onClick={() => setMenuOpen(false)} style={{ color: 'var(--charcoal)', fontSize: 18, fontWeight: 400, textDecoration: 'none', padding: '12px 0', borderBottom: '1px solid var(--border)' }} className='font-display'>
                {t(l.key)}
              </a>
            ))}
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <a href='#programs' className='btn-gold' onClick={() => setMenuOpen(false)} style={{ textAlign: 'center', justifyContent: 'center' }}>
                {t('header.cta')}
              </a>
              <a href='/ar' style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>
                {t('locale.switch')}
              </a>
            </div>
          </div>
          {menuOpen && <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: -1 }} aria-hidden='true' />}
        </header>

        {/* Responsive utility styles */}
        <style>{`
          @media (max-width: 767px) {
            .hidden-mobile { display: none !important; }
            .show-mobile { display: flex !important; }
          }
          @media (min-width: 768px) {
            .show-mobile { display: none !important; }
          }
        `}</style>

        <main>
          {/* ══════════════════════════════════════════
              HERO
          ══════════════════════════════════════════ */}
          <section
            aria-label='Hero'
            style={{
              paddingTop: 'clamp(100px, 14vw, 140px)',
              paddingBottom: 'clamp(60px, 8vw, 100px)',
              paddingLeft: 24,
              paddingRight: 24,
              maxWidth: 1200,
              margin: '0 auto',
            }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'clamp(48px, 6vw, 80px)', alignItems: 'center' }}>
              <div style={{ maxWidth: 680 }}>
                {/* Eyebrow */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                  <span className='section-line' />
                  <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)' }}>{t('hero.eyebrow')}</span>
                </div>

                {/* Headline */}
                <h1
                  className='font-display'
                  style={{
                    fontSize: 'clamp(44px, 6.5vw, 88px)',
                    fontWeight: 500,
                    lineHeight: 1.05,
                    color: 'var(--charcoal)',
                    letterSpacing: '-0.02em',
                    marginBottom: 28,
                  }}>
                  {t('hero.headline1')}
                  <br />
                  <em style={{ fontStyle: 'italic', color: 'var(--gold)', fontWeight: 400 }}>{t('hero.headline2')}</em>
                  <br />
                  {t('hero.headline3')}
                </h1>

                {/* Subtext */}
                <p style={{ fontSize: 'clamp(15px, 1.6vw, 17px)', lineHeight: 1.75, color: 'var(--muted)', maxWidth: 500, marginBottom: 36 }}>{t('hero.sub')}</p>

                {/* CTAs */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 44 }}>
                  <a href='#programs' className='btn-gold'>
                    {t('hero.cta1')}
                    <span aria-hidden='true' className='rtl:scale-x-[-1]' >→</span>
                  </a>
                  <a href='#results' className='btn-outline'>
                    {t('hero.cta2')}
                  </a>
                </div>

                {/* Social proof line */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 40 }}>
                  {/* Avatar stack */}
                  <div style={{ display: 'flex' }}>
                    {['#8B7355', '#6B7C6E', '#7A6548', '#9B8A6A'].map((bg, i) => (
                      <div
                        key={i}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: bg,
                          border: '2px solid var(--cream)',
                          marginLeft: i === 0 ? 0 : -8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          color: '#fff',
                          fontWeight: 600,
                        }}
                        aria-hidden='true'>
                        {['S', 'M', 'A', 'R'][i]}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ display: 'flex', gap: 2, marginBottom: 3 }}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <svg key={s} width='12' height='12' viewBox='0 0 12 12' fill='var(--gold)' aria-hidden='true'>
                          <path d='M6 1l1.39 2.81L10.5 4.24l-2.25 2.19.53 3.1L6 8l-2.78 1.53.53-3.1L1.5 4.24l3.11-.43L6 1z' />
                        </svg>
                      ))}
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>{t('hero.socialProof')}</span>
                  </div>
                </div>

                {/* Trust stats */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, paddingTop: 32, borderTop: '1px solid var(--border)' }}>
                  {[
                    { num: '340+', label: t('hero.stat1') },
                    { num: '94%', label: t('hero.stat2') },
                    { num: '6 yrs', label: t('hero.stat3') },
                  ].map(s => (
                    <div key={s.label}>
                      <div className='font-display' style={{ fontSize: 'clamp(28px, 3vw, 38px)', fontWeight: 600, color: 'var(--charcoal)', lineHeight: 1 }}>
                        {s.num}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hero visual */}
              <div style={{ position: 'relative' }} aria-hidden='true'>
                 <img
                  src='/hero-avatar.jpg'
                  alt='Coach profile photo'
                  style={{
                    width: '100%',
                    maxWidth: 480,
                    aspectRatio: '4/5',
                    objectFit: 'cover',
                    borderRadius: 2,
                     display: 'block',
                  }}
                />
                {/* Floating badge */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: -20,
                    left: -20,
                    background: 'var(--charcoal)',
                    color: '#fff',
                    padding: '18px 24px',
                    minWidth: 160,
                  }}>
                  <div className='font-display' style={{ fontSize: 28, fontWeight: 600, lineHeight: 1 }}>
                    6+
                  </div>
                  <div style={{ fontSize: 12, color: '#aaa', marginTop: 4, letterSpacing: '0.04em' }}>{t('hero.badge')}</div>
                </div>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════
              MARQUEE BAND
          ══════════════════════════════════════════ */}
          <div dir='ltr' style={{ background: 'var(--charcoal)', overflow: 'hidden', padding: '14px 0', borderTop: '1px solid var(--border-dark)', borderBottom: '1px solid var(--border-dark)' }}>
            <style>{`
              @keyframes marquee {
                from { transform: translateX(0); }
                to { transform: translateX(-50%); }
              }
              .marquee-track {
                display: flex;
                width: max-content;
                animation: marquee 28s linear infinite;
              }
            `}</style>
            <div className='marquee-track' aria-hidden='true'>
              {[...Array(2)].map((_, rep) => (
                <div key={rep} style={{ display: 'flex', gap: 48, paddingRight: 48 }}>
                  {[t('marquee.0'), t('marquee.1'), t('marquee.2'), t('marquee.3'), t('marquee.4'), t('marquee.5')].map((item, i) => (
                    <span key={i} style={{ color: '#fff', fontSize: 12, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 20 }}>
                      {item}
                      <span style={{ color: 'var(--gold)', fontSize: 16 }}>✦</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* ══════════════════════════════════════════
              WHO THIS IS FOR
          ══════════════════════════════════════════ */}
          <section id='about' aria-labelledby='audience-heading' style={{ padding: 'clamp(72px, 10vw, 120px) 24px' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <FadeIn>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <span className='section-line' />
                  <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)' }}>{t('audience.eyebrow')}</span>
                </div>
                <h2 id='audience-heading' className='font-display' style={{ fontSize: 'clamp(34px, 4.5vw, 56px)', fontWeight: 500, lineHeight: 1.1, color: 'var(--charcoal)', maxWidth: 520, marginBottom: 56 }}>
                  {t('audience.heading')}
                </h2>
              </FadeIn>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 2 }}>
                {audienceCards.map((card, i) => (
                  <FadeIn key={i} delay={i * 0.08}>
                    <div
                      style={{
                        padding: '36px 32px',
                        background: i % 2 === 0 ? 'var(--white)' : 'var(--cream)',
                        border: '1px solid var(--border)',
                        height: '100%',
                      }}>
                      <div style={{ width: 40, height: 2, background: 'var(--gold)', marginBottom: 24 }} />
                      <h3 className='font-display' style={{ fontSize: 22, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 12, lineHeight: 1.2 }}>
                        {t(card.titleKey)}
                      </h3>
                      <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--muted)' }}>{t(card.descKey)}</p>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════
              RESULTS / TRANSFORMATION
          ══════════════════════════════════════════ */}
          <section
            id='results'
            aria-labelledby='results-heading'
            style={{
              padding: 'clamp(72px, 10vw, 120px) 24px',
              background: 'var(--charcoal)',
            }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <FadeIn>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <span style={{ width: 40, height: 2, background: 'var(--gold)', display: 'block' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)' }}>{t('results.eyebrow')}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 56, gap: 24 }}>
                  <h2 id='results-heading' className='font-display' style={{ fontSize: 'clamp(34px, 4.5vw, 56px)', fontWeight: 500, lineHeight: 1.1, color: '#fff', maxWidth: 460 }}>
                    {t('results.heading')}
                  </h2>
                  <p style={{ fontSize: 15, color: '#999', maxWidth: 360, lineHeight: 1.7 }}>{t('results.sub')}</p>
                </div>
              </FadeIn>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2 }}>
                {results.map((r, i) => (
                  <FadeIn key={i} delay={i * 0.1}>
                    <div
                      style={{
                        background: i === 1 ? 'var(--gold)' : '#222',
                        padding: '40px 32px',
                        height: '100%',
                      }}>
                      {/* Before/after strip */}
                      <div style={{ display: 'flex', gap: 2, marginBottom: 28 }}>
  <div style={{ flex: 1, position: 'relative' }}>
    <img
      src={r.beforeImage}
      alt={`Before photo of ${t(r.nameKey)}`}
      style={{
        width: '100%',
        height: 120,
        objectFit: 'cover',
        display: 'block',
      }}
    />
    <span
      style={{
        position: 'absolute',
        bottom: 8,
        left: 8,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        background: 'rgba(0,0,0,0.65)',
        color: '#fff',
        padding: '4px 8px',
      }}>
      Before
    </span>
  </div>

  <div style={{ flex: 1, position: 'relative' }}>
    <img
      src={r.afterImage}
      alt={`After photo of ${t(r.nameKey)}`}
      style={{
        width: '100%',
        height: 120,
        objectFit: 'cover',
        display: 'block',
      }}
    />
    <span
      style={{
        position: 'absolute',
        bottom: 8,
        left: 8,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        background: i === 1 ? 'rgba(24,24,24,0.75)' : 'rgba(0,0,0,0.65)',
        color: '#fff',
        padding: '4px 8px',
      }}>
      After
    </span>
  </div>
</div>
                      <div className='font-display' style={{ fontSize: 38, fontWeight: 600, color: i === 1 ? 'var(--charcoal)' : '#fff', lineHeight: 1, marginBottom: 6 }}>
                        {t(r.statKey)}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: i === 1 ? 'var(--charcoal)' : 'var(--gold)', marginBottom: 16 }}>
                        {t(r.goalKey)} · {r.duration}
                      </div>
                      <p style={{ fontSize: 14, lineHeight: 1.65, color: i === 1 ? 'rgba(24,24,24,0.8)' : '#aaa', marginBottom: 20 }}>"{t(r.quoteKey)}"</p>
                      <div style={{ fontSize: 13, fontWeight: 600, color: i === 1 ? 'var(--charcoal)' : '#ccc' }}>— {t(r.nameKey)}</div>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════
              COACHING FEATURES
          ══════════════════════════════════════════ */}
          <section aria-labelledby='features-heading' style={{ padding: 'clamp(72px, 10vw, 120px) 24px' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'clamp(48px, 6vw, 80px)' }}>
                <FadeIn>
                  <div style={{ maxWidth: 540 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                      <span className='section-line' />
                      <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)' }}>{t('features.eyebrow')}</span>
                    </div>
                    <h2 id='features-heading' className='font-display' style={{ fontSize: 'clamp(34px, 4.5vw, 56px)', fontWeight: 500, lineHeight: 1.1, color: 'var(--charcoal)' }}>
                      {t('features.heading')}
                    </h2>
                  </div>
                </FadeIn>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 40 }}>
                  {features.map((f, i) => (
                    <FadeIn key={i} delay={i * 0.06}>
                      <div style={{ paddingTop: 24, borderTop: '1px solid var(--border)' }}>
                        <span className='feature-num' aria-hidden='true'>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 10 }}>{t(f.titleKey)}</h3>
                        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--muted)' }}>{t(f.descKey)}</p>
                      </div>
                    </FadeIn>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════
              HOW IT WORKS
          ══════════════════════════════════════════ */}
          <section
            aria-labelledby='steps-heading'
            style={{
              padding: 'clamp(72px, 10vw, 120px) 24px',
              background: 'var(--white)',
              borderTop: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
            }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <FadeIn>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <span className='section-line' />
                  <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)' }}>{t('steps.eyebrow')}</span>
                </div>
                <h2 id='steps-heading' className='font-display' style={{ fontSize: 'clamp(34px, 4.5vw, 56px)', fontWeight: 500, lineHeight: 1.1, color: 'var(--charcoal)', marginBottom: 64 }}>
                  {t('steps.heading')}
                </h2>
              </FadeIn>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 0 }}>
                {steps.map((s, i) => (
                  <FadeIn key={i} delay={i * 0.1}>
                    <div
                      style={{
                        padding: '40px 32px',
                        borderLeft: i === 0 ? '1px solid var(--border)' : 'none',
                        borderRight: '1px solid var(--border)',
                        borderTop: '1px solid var(--border)',
                        borderBottom: '1px solid var(--border)',
                        position: 'relative',
                      }}>
                      <span className='font-display' style={{ fontSize: 56, fontWeight: 400, color: 'var(--border)', lineHeight: 1, display: 'block', marginBottom: 20 }} aria-hidden='true'>
                        {s.num}
                      </span>
                      <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 12 }}>{t(s.titleKey)}</h3>
                      <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--muted)' }}>{t(s.descKey)}</p>
                      {i < steps.length - 0 && (
                        <span
                          style={{
                            position: 'absolute',
                            right: -10,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--gold)',
                            fontSize: 16,
                            zIndex: 1,
                            background: 'var(--white)',
                            padding: '2px 0',
                          }}
                          aria-hidden='true'
                          className='scale-x-[-1]'>
                          →
                        </span>
                      )}
                    </div>
                  </FadeIn>
                ))}
              </div>

              <FadeIn delay={0.3}>
                <div style={{ textAlign: 'center', marginTop: 56 }}>
                  <a href='#programs' className='btn-primary'>
                    {t('steps.cta')}
                    <span aria-hidden='true' className='scale-x-[-1] '>
                      →
                    </span>
                  </a>
                </div>
              </FadeIn>
            </div>
          </section>

          {/* ══════════════════════════════════════════
              WHY CHOOSE THIS COACH
          ══════════════════════════════════════════ */}
          <section aria-labelledby='why-heading' style={{ padding: 'clamp(72px, 10vw, 120px) 24px' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'clamp(40px, 6vw, 80px)', alignItems: 'start' }}>
                <FadeIn>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                      <span className='section-line' />
                      <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)' }}>{t('why.eyebrow')}</span>
                    </div>
                    <h2 id='why-heading' className='font-display' style={{ fontSize: 'clamp(34px, 4vw, 52px)', fontWeight: 500, lineHeight: 1.1, color: 'var(--charcoal)', marginBottom: 24 }}>
                      {t('why.heading')}
                    </h2>
                    <p style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--muted)', marginBottom: 36 }}>{t('why.sub')}</p>
                    {/* Coach image placeholder */}
                    <div className='img-placeholder' style={{ width: '100%', maxWidth: 360, height: 280 }} role='img' aria-label='Coach photo' />
                  </div>
                </FadeIn>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {whyItems.map((w, i) => (
                    <FadeIn key={i} delay={i * 0.08}>
                      <div style={{ padding: '28px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                        <div style={{ flexShrink: 0, width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', marginTop: 7 }} aria-hidden='true' />
                        <div>
                          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 8 }}>{t(w.titleKey)}</h3>
                          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--muted)' }}>{t(w.descKey)}</p>
                        </div>
                      </div>
                    </FadeIn>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════
              PROGRAMS / PRICING
          ══════════════════════════════════════════ */}
          <section
            id='programs'
            aria-labelledby='programs-heading'
            style={{
              padding: 'clamp(72px, 10vw, 120px) 24px',
              background: 'var(--charcoal)',
            }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <FadeIn>
                <div style={{ textAlign: 'center', marginBottom: 64 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
                    <span style={{ width: 40, height: 2, background: 'var(--gold)', display: 'block' }} />
                    <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)' }}>{t('plans.eyebrow')}</span>
                    <span style={{ width: 40, height: 2, background: 'var(--gold)', display: 'block' }} />
                  </div>
                  <h2 id='programs-heading' className='font-display' style={{ fontSize: 'clamp(34px, 4.5vw, 56px)', fontWeight: 500, lineHeight: 1.1, color: '#fff', marginBottom: 16 }}>
                    {t('plans.heading')}
                  </h2>
                  <p style={{ fontSize: 15, color: '#999', maxWidth: 440, margin: '0 auto' }}>{t('plans.sub')}</p>
                </div>
              </FadeIn>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2 }}>
                {plans.map((plan, i) => (
                  <FadeIn key={i} delay={i * 0.1}>
                    <div
                      className={`plan-card${plan.featured ? ' featured' : ''}`}
                      style={{
                        background: plan.featured ? 'var(--gold)' : '#1E1E1E',
                        padding: '40px 32px',
                        position: 'relative',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                      }}>
                      {plan.featured && (
                        <div style={{ position: 'absolute', top: -1, right: 32 }}>
                          <span
                            style={{
                              display: 'inline-block',
                              background: 'var(--charcoal)',
                              color: '#fff',
                              fontSize: 11,
                              fontWeight: 600,
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              padding: '5px 12px',
                            }}>
                            {t('plans.badge')}
                          </span>
                        </div>
                      )}

                      <div style={{ marginBottom: 28 }}>
                        <h3 className='font-display' style={{ fontSize: 26, fontWeight: 600, color: plan.featured ? 'var(--charcoal)' : '#fff', marginBottom: 10, lineHeight: 1.1 }}>
                          {t(plan.titleKey)}
                        </h3>
                        <p style={{ fontSize: 13, color: plan.featured ? 'rgba(24,24,24,0.65)' : '#888', lineHeight: 1.6 }}>{t(plan.descKey)}</p>
                      </div>

                      <div style={{ marginBottom: 32 }}>
                        <span className='font-display' style={{ fontSize: 52, fontWeight: 600, color: plan.featured ? 'var(--charcoal)' : '#fff', lineHeight: 1 }}>
                          {t(plan.priceKey)}
                        </span>
                        <span style={{ fontSize: 14, color: plan.featured ? 'rgba(24,24,24,0.6)' : '#777', marginLeft: 6 }}>{t(plan.periodKey)}</span>
                      </div>

                      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 36, flex: 1 }}>
                        {plan.featuresKeys.map((fk, fi) => (
                          <li key={fi} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <span style={{ flexShrink: 0, color: plan.featured ? 'var(--charcoal)' : 'var(--gold)', fontSize: 14, marginTop: 2 }} aria-hidden='true'>
                              ✓
                            </span>
                            <span style={{ fontSize: 14, color: plan.featured ? 'rgba(24,24,24,0.85)' : '#ccc', lineHeight: 1.5 }}>{t(fk)}</span>
                          </li>
                        ))}
                      </ul>

                      <a
                        href='#contact'
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          padding: '14px 24px',
                          background: plan.featured ? 'var(--charcoal)' : 'transparent',
                          color: plan.featured ? '#fff' : 'var(--gold)',
                          border: plan.featured ? 'none' : '1.5px solid var(--gold)',
                          fontSize: 13,
                          fontWeight: 600,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          textDecoration: 'none',
                          transition: 'background 0.25s, color 0.25s',
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                        onMouseEnter={e => {
                          if (!plan.featured) {
                            e.currentTarget.style.background = 'var(--gold)';
                            e.currentTarget.style.color = 'var(--charcoal)';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!plan.featured) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--gold)';
                          }
                        }}>
                        {t(plan.ctaKey)} →
                      </a>
                    </div>
                  </FadeIn>
                ))}
              </div>

              <FadeIn delay={0.2}>
                <p style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: '#777' }}>{t('plans.note')}</p>
              </FadeIn>
            </div>
          </section>

          {/* ══════════════════════════════════════════
              TESTIMONIALS
          ══════════════════════════════════════════ */}
          <section aria-labelledby='testimonials-heading' style={{ padding: 'clamp(72px, 10vw, 120px) 24px' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <FadeIn>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <span className='section-line' />
                  <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)' }}>{t('testimonials.eyebrow')}</span>
                </div>
                <h2 id='testimonials-heading' className='font-display' style={{ fontSize: 'clamp(34px, 4.5vw, 56px)', fontWeight: 500, lineHeight: 1.1, color: 'var(--charcoal)', marginBottom: 56 }}>
                  {t('testimonials.heading')}
                </h2>
              </FadeIn>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
                {testimonials.map((t_item, i) => (
                  <FadeIn key={i} delay={i * 0.06}>
                    <article
                      className='testimonial-card'
                      style={{
                        padding: '36px 32px',
                        background: i % 3 === 1 ? 'var(--charcoal)' : 'var(--white)',
                        border: '1px solid var(--border)',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 20,
                      }}>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {[...Array(t_item.rating)].map((_, si) => (
                          <svg key={si} width='13' height='13' viewBox='0 0 12 12' fill='var(--gold)' aria-hidden='true'>
                            <path d='M6 1l1.39 2.81L10.5 4.24l-2.25 2.19.53 3.1L6 8l-2.78 1.53.53-3.1L1.5 4.24l3.11-.43L6 1z' />
                          </svg>
                        ))}
                      </div>
                      <blockquote style={{ flex: 1 }}>
                        <p className='font-display' style={{ fontSize: 'clamp(16px, 1.5vw, 19px)', lineHeight: 1.55, color: i % 3 === 1 ? '#fff' : 'var(--charcoal)', fontStyle: 'italic', fontWeight: 400 }}>
                          "{t(t_item.quoteKey)}"
                        </p>
                      </blockquote>
                      <footer style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 16, borderTop: `1px solid ${i % 3 === 1 ? 'var(--border-dark)' : 'var(--border)'}` }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: 'var(--gold)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 13,
                            fontWeight: 700,
                            color: 'var(--charcoal)',
                            flexShrink: 0,
                          }}
                          aria-hidden='true'>
                          {t(t_item.nameKey).charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: i % 3 === 1 ? '#fff' : 'var(--charcoal)' }}>{t(t_item.nameKey)}</div>
                          <div style={{ fontSize: 12, color: i % 3 === 1 ? '#aaa' : 'var(--muted)' }}>{t(t_item.roleKey)}</div>
                        </div>
                      </footer>
                    </article>
                  </FadeIn>
                ))}
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════
              FAQ
          ══════════════════════════════════════════ */}
          <section
            id='faq'
            aria-labelledby='faq-heading'
            style={{
              padding: 'clamp(72px, 10vw, 120px) 24px',
              background: 'var(--white)',
              borderTop: '1px solid var(--border)',
            }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <FadeIn>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <span className='section-line' />
                  <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)' }}>{t('faq.eyebrow')}</span>
                </div>
                <h2 id='faq-heading' className='font-display' style={{ fontSize: 'clamp(34px, 4.5vw, 56px)', fontWeight: 500, lineHeight: 1.1, color: 'var(--charcoal)', marginBottom: 56 }}>
                  {t('faq.heading')}
                </h2>
              </FadeIn>

              <dl>
                {faqs.map((f, i) => (
                  <FadeIn key={i} delay={i * 0.05}>
                    <div style={{ borderBottom: '1px solid var(--border)' }}>
                      <dt>
                        <button
                          onClick={() => setOpenFaq(openFaq === i ? null : i)}
                          aria-expanded={openFaq === i}
                          style={{
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '22px 0',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            gap: 16,
                          }}>
                          <span style={{ fontSize: 'clamp(15px, 1.4vw, 17px)', fontWeight: 500, color: 'var(--charcoal)', lineHeight: 1.4 }}>{t(f.qKey)}</span>
                          <span
                            style={{
                              flexShrink: 0,
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              border: '1.5px solid var(--border)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 14,
                              color: 'var(--gold)',
                              transition: 'transform 0.3s',
                              transform: openFaq === i ? 'rotate(45deg)' : 'none',
                            }}
                            aria-hidden='true'>
                            +
                          </span>
                        </button>
                      </dt>
                      <dd className={`faq-answer${openFaq === i ? ' open' : ''}`}>
                        <p style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--muted)', paddingBottom: 22 }}>{t(f.aKey)}</p>
                      </dd>
                    </div>
                  </FadeIn>
                ))}
              </dl>
            </div>
          </section>

          {/* ══════════════════════════════════════════
              FINAL CTA
          ══════════════════════════════════════════ */}
          <section
            aria-labelledby='cta-heading'
            style={{
              padding: 'clamp(80px, 12vw, 140px) 24px',
              background: 'var(--charcoal)',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}>
            {/* Background texture lines */}
            <div
              aria-hidden='true'
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(255,255,255,0.02) 80px, rgba(255,255,255,0.02) 81px)',
                pointerEvents: 'none',
              }}
            />
            <div style={{ maxWidth: 640, margin: '0 auto', position: 'relative' }}>
              <FadeIn>
                <span style={{ width: 40, height: 2, background: 'var(--gold)', display: 'block', margin: '0 auto 24px' }} />
                <h2 id='cta-heading' className='font-display' style={{ fontSize: 'clamp(38px, 5.5vw, 72px)', fontWeight: 500, lineHeight: 1.05, color: '#fff', marginBottom: 24, letterSpacing: '-0.02em' }}>
                  {t('cta.heading')}
                </h2>
                <p style={{ fontSize: 16, lineHeight: 1.75, color: '#aaa', marginBottom: 44 }}>{t('cta.sub')}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                  <a href='#programs' className='btn-gold' style={{ padding: '16px 40px', fontSize: 15 }}>
                    {t('cta.primary')}
                    <span aria-hidden='true' className='scale-x-[-1] '>
                      →
                    </span>
                  </a>
                  <a
                    href='mailto:coach@example.com'
                    className='btn-outline'
                    style={{ color: '#fff', borderColor: '#444', padding: '15px 32px', fontSize: 14 }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#fff';
                      e.currentTarget.style.color = 'var(--charcoal)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#fff';
                    }}>
                    {t('cta.secondary')}
                  </a>
                </div>
                <p style={{ fontSize: 13, color: '#666', marginTop: 28 }}>{t('cta.note')}</p>
              </FadeIn>
            </div>
          </section>
        </main>

        {/* ══════════════════════════════════════════
            FOOTER
        ══════════════════════════════════════════ */}
        <footer
          style={{
            background: '#111',
            color: '#aaa',
            padding: 'clamp(48px, 6vw, 72px) 24px 32px',
          }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 48, marginBottom: 56 }}>
              {/* Brand col */}
              <div>
                <a href='#' style={{ textDecoration: 'none', display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 16 }}>
                  <span className='font-display' style={{ fontSize: 20, fontWeight: 600, color: '#fff' }}>
                    {t('brand.name')}
                  </span>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--gold)', display: 'inline-block', marginBottom: 3 }} />
                </a>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: '#777', maxWidth: 240 }}>{t('footer.tagline')}</p>
                {/* Socials */}
                <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
                  {['IG', 'TW', 'YT', 'TK'].map(s => (
                    <a
                      key={s}
                      href='#'
                      aria-label={`Follow on ${s}`}
                      style={{
                        width: 36,
                        height: 36,
                        border: '1px solid #2A2A2A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        color: '#888',
                        textDecoration: 'none',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        transition: 'border-color 0.2s, color 0.2s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'var(--gold)';
                        e.currentTarget.style.color = 'var(--gold)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = '#2A2A2A';
                        e.currentTarget.style.color = '#888';
                      }}>
                      {s}
                    </a>
                  ))}
                </div>
              </div>

              {/* Nav */}
              <div>
                <h3 style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', marginBottom: 20 }}>{t('footer.nav')}</h3>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {navLinks.map(l => (
                    <li key={l.key}>
                      <a
                        href={l.href}
                        className='link-underline'
                        style={{ fontSize: 14, color: '#777', textDecoration: 'none', transition: 'color 0.2s' }}
                        onMouseEnter={e => {
                          e.currentTarget.style.color = '#fff';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.color = '#777';
                        }}>
                        {t(l.key)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contact */}
              <div>
                <h3 style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', marginBottom: 20 }}>{t('footer.contact')}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <a
                    href='mailto:coach@example.com'
                    style={{ fontSize: 14, color: '#777', textDecoration: 'none' }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = 'var(--gold)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = '#777';
                    }}>
                    coach@example.com
                  </a>
                  <a
                    href='https://instagram.com'
                    target='_blank'
                    rel='noopener noreferrer'
                    style={{ fontSize: 14, color: '#777', textDecoration: 'none' }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = 'var(--gold)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = '#777';
                    }}>
                    @yourhandle
                  </a>
                </div>
              </div>
            </div>

            <div style={{ paddingTop: 24, borderTop: '1px solid #1E1E1E', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <p style={{ fontSize: 13, color: '#555' }}>
                © {new Date().getFullYear()} {t('brand.name')}. {t('footer.rights')}
              </p>
              <div style={{ display: 'flex', gap: 20 }}>
                <a href='#' style={{ fontSize: 13, color: '#555', textDecoration: 'none' }}>
                  {t('footer.privacy')}
                </a>
                <a href='#' style={{ fontSize: 13, color: '#555', textDecoration: 'none' }}>
                  {t('footer.terms')}
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
