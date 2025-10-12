'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Users, Video, Salad, Sparkles, Target, CheckCircle2, ClipboardList, MessageSquare, MapPin, Clock, Phone, Mail, Navigation as NavIcon, ShieldCheck, Crown, Star, Quote, Timer, Scale, LineChart, Menu, X } from 'lucide-react';
import { useUser } from '@/hooks/useUser';

export const spring = { type: 'spring', stiffness: 360, damping: 30, mass: 0.7 };

export function Container({ className = '', children }) {
  return <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}
export function Section({ id, className = '', children }) {
  return (
    <section id={id} className={`scroll-mt-24 py-14 sm:py-20 ${className}`}>
      {children}
    </section>
  );
}
export function Button({ as: As = 'button', variant = 'primary', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-500/30';
  const styles = variant === 'primary' ? 'bg-gradient-to-tr from-indigo-600 to-blue-500 text-white hover:opacity-95' : variant === 'ghost' ? 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-800' : 'bg-slate-800 text-white hover:bg-slate-700';
  const Comp = As;
  return <Comp className={`${base} ${styles} ${className}`} {...props} />;
}
export function Badge({ children }) {
  return <span className='inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100'>{children}</span>;
}
export function Card({ className = '', children }) {
  return <div className={`relative rounded-lg border border-slate-200 bg-white/80 backdrop-blur shadow-[0_8px_30px_rgba(0,0,0,0.05)] ${className}`}>{children}</div>;
}
export function Input({ className = '', ...props }) {
  return <input className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${className}`} {...props} />;
}
export function Textarea({ className = '', ...props }) {
  return <textarea className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${className}`} {...props} />;
}
export function Select({ className = '', ...props }) {
  return <select className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${className}`} {...props} />;
}
export function Feature({ icon: Icon, title, children }) {
  return (
    <div className='flex items-start gap-3'>
      {Icon && (
        <div className='mt-1 w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 grid place-items-center'>
          <Icon className='w-5 h-5' />
        </div>
      )}
      <div>
        <div className='font-semibold'>{title}</div>
        <div className='text-slate-600 text-sm mt-1'>{children}</div>
      </div>
    </div>
  );
}

/* ======================= Sticky Navbar (anchors) ======================= */

/* ======================= Auth-driven nav helpers ======================= */

/* ======================= Role links (JS) ======================= */
function getRoleLinks(role) {
  if (!role) return []; // <- no role? no private links
  const links = [];
  if (role === 'admin') {
    links.push({ href: '/dashboard', label: 'Dashboard' }, { href: '/dashboard/users', label: 'Users' });
  } else if (role === 'coach') {
    links.push({ href: '/dashboard', label: 'Dashboard' }, { href: '/dashboard/assign/user', label: 'Assign Users' }, { href: '/dashboard/workouts', label: 'Workouts' });
  } else if (role === 'client') {
    links.push({ href: '/dashboard/my', label: 'My Dashboard' }, { href: '/dashboard/my/workouts', label: 'My Workouts' });
  } else {
    links.push({ href: '/dashboard', label: 'Dashboard' });
  }
  return links;
}

function initialsFromName(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] || '';
  const b = parts[1]?.[0] || '';
  return (a + b).toUpperCase();
}

/* ======================= Sign out (clear + redirect) ======================= */
const LOGOUT_REDIRECT = '/auth';
function clearUserStorage() {
  try {
    // remove known keys (tweak to match your app)
    localStorage.removeItem('token');
    localStorage.removeItem('auth');
    localStorage.removeItem('user');
    localStorage.removeItem('mw.workout.buffer'); // example from your app
    // or nuke all:
    // localStorage.clear();
  } catch (e) {}
}
function handleLogout() {
  clearUserStorage();
  // optional: call your API /logout here
  window.location.href = LOGOUT_REDIRECT;
}

/* ======================= User dropdown ======================= */
function UserMenu({ user }) {
  const [open, setOpen] = React.useState(false);
  const role = user?.role || null;
  const items = getRoleLinks(role);

  React.useEffect(() => {
    const onEsc = e => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, []);

  if (!user) return null; // safety

  return (
    <div className='relative'>
      <button onClick={() => setOpen(v => !v)} className='inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50' aria-haspopup='menu' aria-expanded={open}>
        <span className='inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white text-xs'>{initialsFromName(user?.name || user?.email)}</span>
        <span className='hidden sm:inline text-slate-800 font-medium truncate max-w-[140px]'>{user?.name || user?.email || 'User'}</span>
        {role && <span className='text-[11px] text-slate-500 hidden md:inline'>({role})</span>}
        <svg className='h-4 w-4 text-slate-500' viewBox='0 0 20 20' fill='currentColor'>
          <path d='M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.4a.75.75 0 01-1.08 0l-4.25-4.4a.75.75 0 01.02-1.06z' />
        </svg>
      </button>

      {open && (
        <div role='menu' className='absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white shadow-lg z-50 overflow-hidden'>
          <div className='px-3 py-2 text-xs text-slate-500 border-b border-slate-100'>
            Signed in as <span className='font-medium text-slate-700'>{user?.email || user?.name}</span>
          </div>

          {!!items.length && (
            <div className='py-1'>
              {items.map(it => (
                <a key={it.href} href={it.href} onClick={() => setOpen(false)} className='block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'>
                  {it.label}
                </a>
              ))}
            </div>
          )}

          <div className='border-t border-slate-100'>
            <a href='/profile' onClick={() => setOpen(false)} className='block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'>
              Profile
            </a>
            <button type='button' onClick={handleLogout} className='w-full text-left block px-3 py-2 text-sm text-rose-600 hover:bg-rose-50'>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ======================= Navbar ======================= */
function Navbar() {
  const [open, setOpen] = React.useState(false);

  // hash smooth-scroll (unchanged)
  React.useEffect(() => {
    const onHash = () => {
      const target = document.querySelector(window.location.hash);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // ✅ get user safely from your hook (supports {user,loading} or direct user)
  const hook = useUser();
  const user = hook?.user ?? hook ?? null;
  const loading = hook?.loading ?? false;

  const LinkBtn = ({ href, children }) => (
    <a href={href} onClick={() => setOpen(false)} className='px-3 py-2 text-sm rounded-lg hover:bg-white/60'>
      {children}
    </a>
  );

  return (
    <header className='sticky top-0 z-40 border-b border-slate-200/70 backdrop-blur bg-white/80'>
      <Container className='flex h-16 items-center justify-between'>
        <a href='#top' className='font-extrabold tracking-tight text-slate-800'>
          Fit<span className='text-indigo-600'>Studio</span>
        </a>

        {/* DESKTOP NAV */}
        <nav className='hidden md:flex items-center gap-2'>
          <LinkBtn href='#programs'>Programs</LinkBtn>
          <LinkBtn href='#pricing'>Pricing</LinkBtn>
          <LinkBtn href='#stories'>Stories</LinkBtn>
          <LinkBtn href='#contact'>Contact</LinkBtn>

          {/* auth-aware area */}
          {!loading && !user && (
            <>
              <Button as='a' href='/auth' className='mt-2'>
                Sign in
              </Button>
            </>
          )}

          {!loading && user && <UserMenu user={user} />}
        </nav>

        {/* MOBILE BURGER */}
        <button className='md:hidden p-2' onClick={() => setOpen(v => !v)} aria-label='Menu'>
          {open ? <X className='w-5 h-5' /> : <Menu className='w-5 h-5' />}
        </button>
      </Container>

      {/* MOBILE PANEL */}
      {open && (
        <div className='md:hidden border-t border-slate-200 bg-white'>
          <Container className='py-2 flex flex-col'>
            {/* public links */}
            <a onClick={() => setOpen(false)} href='#programs' className='px-2 py-2 text-sm'>
              Programs
            </a>
            <a onClick={() => setOpen(false)} href='#pricing' className='px-2 py-2 text-sm'>
              Pricing
            </a>
            <a onClick={() => setOpen(false)} href='#stories' className='px-2 py-2 text-sm'>
              Stories
            </a>
            <a onClick={() => setOpen(false)} href='#contact' className='px-2 py-2 text-sm'>
              Contact
            </a>

            {/* auth-aware mobile */}
            {!loading && !user && (
              <>
                <Button as='a' href='/auth' className='mt-2'>
                  Sign in
                </Button>
              </>
            )}

            {!loading && user && (
              <>
                <div className='px-2 py-2 text-xs text-slate-500'>
                  Signed in as <span className='font-medium text-slate-700'>{user.email || user.name}</span>
                </div>
                {getRoleLinks(user?.role || null).map(it => (
                  <a key={it.href} href={it.href} onClick={() => setOpen(false)} className='px-2 py-2 text-sm'>
                    {it.label}
                  </a>
                ))}
                <a href='/profile' onClick={() => setOpen(false)} className='px-2 py-2 text-sm'>
                  Profile
                </a>
                <button type='button' onClick={handleLogout} className='text-left px-2 py-2 text-sm text-rose-600'>
                  Sign out
                </button>
              </>
            )}
          </Container>
        </div>
      )}
    </header>
  );
}

/* ======================= Demo Data ======================= */
const PROGRAMS = [
  {
    key: 'gym',
    icon: Dumbbell,
    title: 'Gym Classes',
    tag: 'Group training',
    desc: 'Strength, conditioning, and mobility — scalable for all levels. Small groups so coaches can actually coach.',
    bullets: ['Beginner-friendly Foundations', 'Periodized cycles', 'Technique-first coaching', 'Community vibe'],
    cta: 'See schedule',
    href: '#contact',
  },
  {
    key: 'pt',
    icon: Users,
    title: 'Personal Training',
    tag: '1-on-1 coaching',
    desc: 'Private sessions tailored to your goals and timetable. Perfect for fast, focused progress.',
    bullets: ['Movement assessment', 'Custom program', 'Flexible times', 'Weekly check‑ins'],
    cta: 'Book PT',
    href: '#contact',
  },
  {
    key: 'online',
    icon: Video,
    title: 'Online Coaching',
    tag: 'Remote',
    desc: 'Fully remote programming with video form checks, habit coaching, and message support — anywhere you are.',
    bullets: ['App-based logging', 'Video feedback', 'Monthly reviews', 'Worldwide access'],
    cta: 'Get started',
    href: '#contact',
  },
  {
    key: 'nutrition',
    icon: Salad,
    title: 'Nutrition Coaching',
    tag: 'Food & habits',
    desc: 'Meal templates and grocery lists tailored to you. We focus on sustainable changes, not crash diets.',
    bullets: ['Macro targets', 'Meal plans', 'Recipe library', 'Weekly adjustments'],
    cta: 'View plans',
    href: '#pricing',
  },
];

const PLANS = [
  {
    key: 'basic',
    name: 'Basic',
    highlight: false,
    monthly: 699,
    yearly: 6990,
    unit: 'EGP',
    tagline: '8 classes / month + open gym',
    features: ['Small‑group classes (8/mo)', 'Open gym access', 'Community chat', 'Coach Q&A (weekly)'],
    cta: 'Choose Basic',
  },
  {
    key: 'plus',
    name: 'Plus',
    highlight: true,
    monthly: 999,
    yearly: 9990,
    unit: 'EGP',
    tagline: 'Unlimited classes + 1 PT / month',
    features: ['Unlimited classes', 'Open gym access', '1× Personal Training / month', 'Priority waitlists'],
    cta: 'Choose Plus',
  },
  {
    key: 'elite',
    name: 'Elite',
    highlight: false,
    monthly: 1899,
    yearly: 18990,
    unit: 'EGP',
    tagline: 'Unlimited + weekly PT + nutrition',
    features: ['Unlimited classes', 'Weekly Personal Training', 'Nutrition coaching', 'Monthly progress review'],
    cta: 'Choose Elite',
  },
];

const STORIES = [
  {
    id: 's1',
    name: 'Mahmoud A.',
    goal: 'Fat loss',
    gender: 'M',
    type: 'PT',
    months: 6,
    startWeight: 96,
    endWeight: 84,
    startBodyFat: 28,
    endBodyFat: 18,
    quote: 'Lost 12 kg without crazy diets. I finally enjoy training.',
    before: 'https://picsum.photos/seed/gym-before-1/1200/900',
    after: 'https://picsum.photos/seed/gym-after-1/1200/900',
  },
  {
    id: 's2',
    name: 'Nour H.',
    goal: 'Recomposition',
    gender: 'F',
    type: 'Online',
    months: 4,
    startWeight: 64,
    endWeight: 62,
    startBodyFat: 27,
    endBodyFat: 21,
    quote: 'Clothes fit better and I feel stronger every week!',
    before: 'https://picsum.photos/seed/gym-before-2/1200/900',
    after: 'https://picsum.photos/seed/gym-after-2/1200/900',
  },
  {
    id: 's3',
    name: 'Omar S.',
    goal: 'Strength',
    gender: 'M',
    type: 'PT',
    months: 5,
    startWeight: 78,
    endWeight: 80,
    startBodyFat: 20,
    endBodyFat: 17,
    quote: 'Hit +60kg on deadlift and fixed my back pain.',
    before: 'https://picsum.photos/seed/gym-before-3/1200/900',
    after: 'https://picsum.photos/seed/gym-after-3/1200/900',
  },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LOCATIONS = [
  {
    id: 'heliopolis',
    name: 'Heliopolis Club',
    address: ['12 Abbas El Akkad St', 'Heliopolis, Cairo'],
    city: 'Cairo',
    phone: '+20 100 123 4567',
    whatsapp: '+201001234567',
    email: 'hello@amazinggym.com',
    mapEmbed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3451.709!2d31.340!3d30.087!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0:0x0!2zMzDCsDA1JzEyLjAiTiAzMcKwMjAnMjQuMCJF!5e0!3m2!1sen!2seg!4v1680000000000',
    mapsLink: 'https://maps.google.com/?q=Amazing+Gym+Heliopolis',
    hours: {
      Mon: ['07:00', '22:00'],
      Tue: ['07:00', '22:00'],
      Wed: ['07:00', '22:00'],
      Thu: ['07:00', '22:00'],
      Fri: ['09:00', '20:00'],
      Sat: ['08:00', '21:00'],
      Sun: ['08:00', '21:00'],
    },
  },
  {
    id: 'zamalek',
    name: 'Zamalek Riverside Studio',
    address: ['5 Nile Corniche', 'Zamalek, Cairo'],
    city: 'Cairo',
    phone: '+20 100 765 4321',
    whatsapp: '+201007654321',
    email: 'zamalek@amazinggym.com',
    mapEmbed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3451.709!2d31.224!3d30.061!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0:0x0!2zMzDCsDAzJzQxLjYiTiAzMcKwMTMnMjYuNCJF!5e0!3m2!1sen!2seg!4v1680000000001',
    mapsLink: 'https://maps.google.com/?q=Amazing+Gym+Zamalek',
    hours: {
      Mon: ['06:30', '22:30'],
      Tue: ['06:30', '22:30'],
      Wed: ['06:30', '22:30'],
      Thu: ['06:30', '22:30'],
      Fri: ['08:00', '20:00'],
      Sat: ['08:00', '21:00'],
      Sun: ['08:00', '21:00'],
    },
  },
];

/* ======================= Page ======================= */
export default function OnePageSite() {
  const [activeLocation, setActiveLocation] = useState(LOCATIONS[0].id);
  const location = useMemo(() => LOCATIONS.find(l => l.id === activeLocation), [activeLocation]);
  const status = useMemo(() => getOpenStatus(location.hours), [location]);

  const [period, setPeriod] = useState('monthly'); // pricing
  const [storyQ, setStoryQ] = useState('');
  const [sort, setSort] = useState('impact');

  const filteredStories = useMemo(() => {
    const s = storyQ.trim().toLowerCase();
    let list = STORIES.filter(x => !s || [x.name, x.goal, x.type].join(' ').toLowerCase().includes(s));
    if (sort === 'months') list.sort((a, b) => a.months - b.months);
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'impact') list.sort((a, b) => delta(b) - delta(a));
    return list;
  }, [storyQ, sort]);

  const kpi = useMemo(() => {
    const n = STORIES.length;
    const lost = STORIES.reduce((acc, x) => acc + Math.max(0, x.startWeight - x.endWeight), 0);
    const avgMonths = Math.round(STORIES.reduce((a, x) => a + x.months, 0) / n);
    return { total: n, lost, avgMonths };
  }, []);

  return (
    <div id='top' className='min-h-dvh flex flex-col bg-gradient-to-b from-white to-slate-50'>
      <Navbar />

      {/* ============ Hero ============ */}
      <Section id='hero' className='pt-10'>
        <Container>
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 items-center'>
            <div className='lg:col-span-6'>
              <Badge>
                <Sparkles className='w-4 h-4' /> Cairo’s friendliest training studio
              </Badge>
              <h1 className='mt-4 text-3xl sm:text-5xl font-extrabold leading-tight'>
                Get stronger, feel better,
                <span className='text-indigo-600'> enjoy training</span>.
              </h1>
              <p className='mt-3 text-slate-600 max-w-xl'>Classes, personal training, online coaching, and nutrition — in one simple place. Start with a free trial and we’ll guide you.</p>
              <div className='mt-5 flex flex-wrap gap-3'>
                <Button as='a' href='#trial'>
                  Book a free trial
                </Button>
                <Button as='a' href='#programs' variant='ghost'>
                  Explore programs
                </Button>
              </div>
            </div>
            <div className='lg:col-span-6'>
              <Card className='p-4'>
                <div className='aspect-[16/9] rounded-lg overflow-hidden bg-slate-200 grid place-items-center text-slate-500'>
                  <span className='text-sm'>Hero image / video placeholder</span>
                </div>
              </Card>
            </div>
          </div>
        </Container>
      </Section>

      {/* ============ Programs ============ */}
      <Section id='programs'>
        <Container>
          <div className='text-center max-w-2xl mx-auto'>
            <Badge>
              <Sparkles className='w-4 h-4' /> Pick your path — or combine them
            </Badge>
            <h2 className='mt-4 text-3xl sm:text-4xl font-extrabold'>Programs & Services</h2>
            <p className='mt-2 text-slate-600'>Whether you love the energy of classes or prefer 1‑on‑1, we’ve got a track that fits your goals, time, and budget.</p>
          </div>

          <div className='mt-8 grid grid-cols-1 md:grid-cols-2 gap-6'>
            {PROGRAMS.map((p, i) => (
              <motion.div key={p.key} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ ...spring, delay: i * 0.03 }}>
                <Card className='p-5 h-full'>
                  <div className='flex items-start gap-3'>
                    <div className='w-12 h-12 rounded-lg bg-indigo-50 text-indigo-700 grid place-items-center'>
                      <p.icon className='w-6 h-6' />
                    </div>
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-center gap-2 flex-wrap'>
                        <div className='font-semibold text-lg'>{p.title}</div>
                        <span className='text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700'>{p.tag}</span>
                      </div>
                      <p className='text-slate-600 text-sm mt-1'>{p.desc}</p>
                      <ul className='mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-700 list-disc pl-5'>
                        {p.bullets.map((b, idx) => (
                          <li key={idx}>{b}</li>
                        ))}
                      </ul>
                      <div className='mt-4 flex gap-2'>
                        <Button as='a' href={p.href}>
                          {p.cta}
                        </Button>
                        <Button as='a' href='#trial' variant='ghost'>
                          Book trial
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* How it works mini-sections */}
          <div className='mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6'>
            <Card className='p-5'>
              <div className='font-semibold text-lg flex items-center gap-2'>
                <Dumbbell className='w-5 h-5' /> How classes work
              </div>
              <div className='mt-2 text-slate-600 text-sm'>Small groups (max 18) split by level. Every 8–12 weeks we switch cycles (hypertrophy → strength → power). Coaches demo, cue, and scale.</div>
              <div className='mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3'>
                <MiniStep icon={ClipboardList} title='Arrive & brief' text='Warm‑up + daily focus' />
                <MiniStep icon={Target} title='Main sets' text='Progressive loading' />
                <MiniStep icon={CheckCircle2} title='Finisher' text='Conditioning or accessories' />
              </div>
            </Card>
            <Card className='p-5'>
              <div className='font-semibold text-lg flex items-center gap-2'>
                <Users className='w-5 h-5' /> Personal training flow
              </div>
              <div className='mt-2 text-slate-600 text-sm'>Start with a movement assessment and goal setting. Your plan fits your calendar, equipment access, and training history.</div>
              <div className='mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3'>
                <MiniStep icon={ClipboardList} title='Assess' text='History + movement' />
                <MiniStep icon={Target} title='Plan' text='Custom program' />
                <MiniStep icon={MessageSquare} title='Check‑ins' text='Weekly adjustments' />
              </div>
            </Card>
          </div>
        </Container>
      </Section>

      {/* ============ Pricing ============ */}
      <Section id='pricing'>
        <Container>
          <div className='text-center max-w-2xl mx-auto'>
            <Badge>
              <Sparkles className='w-4 h-4' /> Simple plans, flexible options
            </Badge>
            <h2 className='mt-4 text-3xl sm:text-4xl font-extrabold'>Pricing & Memberships</h2>
            <p className='mt-2 text-slate-600'>Pick a plan, start training, and cancel anytime. Prices are demo values — set yours in CMS.</p>
            <div className='mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1'>
              <PeriodButton active={period === 'monthly'} onClick={() => setPeriod('monthly')}>
                Monthly
              </PeriodButton>
              <PeriodButton active={period === 'yearly'} onClick={() => setPeriod('yearly')}>
                Yearly <span className='ml-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700'>Save</span>
              </PeriodButton>
            </div>
            <div className='mt-2 text-xs text-slate-500'>{period === 'yearly' ? 'Save ~2 months with annual billing' : 'Switch to annual to save'}</div>
          </div>

          <div className='mt-8 grid grid-cols-1 md:grid-cols-3 gap-5'>
            {PLANS.map(p => (
              <Card key={p.key} className={`p-5 ${p.highlight ? 'ring-2 ring-indigo-500' : ''}`}>
                {p.highlight && (
                  <div className='mb-2'>
                    <Badge>Most popular</Badge>
                  </div>
                )}
                <div className='flex items-center justify-between'>
                  <div className='font-semibold text-lg'>{p.name}</div>
                  {p.highlight ? <Crown className='w-5 h-5 text-indigo-600' /> : <ShieldCheck className='w-5 h-5 text-slate-400' />}
                </div>
                <div className='text-slate-600 text-sm mt-0.5'>{p.tagline}</div>

                <div className='mt-3'>
                  <Price amount={p[period]} unit={p.unit} period={period} />
                </div>

                <ul className='mt-3 space-y-2 text-sm text-slate-700'>
                  {p.features.map((f, i) => (
                    <li key={i} className='flex items-start gap-2'>
                      <CheckCircle2 className='w-4 h-4 text-emerald-600 mt-0.5' />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button className='mt-4 w-full'>{p.cta}</Button>
                <div className='mt-2 text-[11px] text-slate-500'>No contracts. Cancel or change plan anytime.</div>
              </Card>
            ))}
          </div>

          <Card className='mt-8 p-5'>
            <div className='font-semibold'>Included in all plans</div>
            <div className='mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-slate-700'>
              <Inc>Coach oversight & safety first</Inc>
              <Inc>App access for logging & check‑ins</Inc>
              <Inc>Community events & challenges</Inc>
            </div>
          </Card>
        </Container>
      </Section>

      {/* ============ Stories ============ */}
      <Section id='stories'>
        <Container>
          <div className='text-center max-w-2xl mx-auto'>
            <Badge>
              <Sparkles className='w-4 h-4' /> Real people. Real results.
            </Badge>
            <h2 className='mt-4 text-3xl sm:text-4xl font-extrabold'>Success Stories</h2>
            <p className='mt-2 text-slate-600'>Swipe the slider, read their stories, and start yours today.</p>
          </div>

          {/* KPI band */}
          <Card className='mt-8 p-5'>
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 text-center'>
              <div className='rounded-lg border border-slate-200 bg-white p-4'>
                <div className='text-xs text-slate-500'>Total transformations</div>
                <div className='text-2xl font-extrabold'>{kpi.total}</div>
              </div>
              <div className='rounded-lg border border-slate-200 bg-white p-4'>
                <div className='text-xs text-slate-500'>Total kg lost</div>
                <div className='text-2xl font-extrabold'>{kpi.lost}</div>
              </div>
              <div className='rounded-lg border border-slate-200 bg-white p-4'>
                <div className='text-xs text-slate-500'>Avg. program length</div>
                <div className='text-2xl font-extrabold'>{kpi.avgMonths} months</div>
              </div>
            </div>
          </Card>

          {/* Filters */}
          <Card className='mt-6 p-4'>
            <div className='grid grid-cols-1 sm:grid-cols-5 gap-3'>
              <Input placeholder='Search name or goal…' value={storyQ} onChange={e => setStoryQ(e.target.value)} />
              <Select value={sort} onChange={e => setSort(e.target.value)}>
                <option value='impact'>Sort by impact</option>
                <option value='months'>Sort by duration</option>
                <option value='name'>Sort by name</option>
              </Select>
              <div className='sm:col-span-3 text-sm text-slate-500 grid place-items-center'>Tip: Book a free assessment to get a personalized plan.</div>
            </div>
          </Card>

          {/* Stories grid */}
          <div className='mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'>
            {filteredStories.map(s => (
              <Card key={s.id} className='p-4'>
                <BeforeAfter before={s.before} after={s.after} name={s.name} />
                <div className='mt-3 flex items-start justify-between gap-3'>
                  <div>
                    <div className='font-semibold'>{s.name}</div>
                    <div className='text-xs text-slate-500'>
                      {s.goal} • {s.type}
                    </div>
                  </div>
                  <div className='text-right text-xs text-slate-600'>
                    <div className='inline-flex items-center gap-1'>
                      <Timer className='w-3.5 h-3.5' /> {s.months} months
                    </div>
                  </div>
                </div>

                <div className='mt-3 grid grid-cols-3 gap-2 text-center text-xs'>
                  <Stat icon={Scale} label='Weight' value={`${s.startWeight}→${s.endWeight} kg`} />
                  <Stat icon={LineChart} label='Body fat' value={`${s.startBodyFat}%→${s.endBodyFat}%`} />
                  <Impact value={delta(s)} />
                </div>

                <blockquote className='mt-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3'>
                  <div className='flex items-start gap-2'>
                    <Quote className='w-4 h-4 text-slate-400 mt-0.5' />
                    <p className='leading-relaxed'>{s.quote}</p>
                  </div>
                </blockquote>

                <div className='mt-4 flex items-center justify-between gap-2'>
                  <div className='flex flex-wrap gap-1.5'>
                    <span className='text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100'>{s.goal}</span>
                    <span className='text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'>{s.type}</span>
                  </div>
                  <Button as='a' href='#trial' variant='ghost'>
                    Start like {s.name}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* ============ Contact ============ */}
      <Section id='contact'>
        <Container>
          <div className='text-center max-w-2xl mx-auto'>
            <Badge>We’re here to help</Badge>
            <h2 className='mt-4 text-3xl sm:text-4xl font-extrabold'>Contact & Locations</h2>
            <p className='mt-2 text-slate-600'>Call, WhatsApp, or drop by. Choose a branch to see the map and hours.</p>
          </div>

          <Card className='mt-6 p-4'>
            <div className='flex flex-wrap items-center gap-2'>
              {LOCATIONS.map(l => (
                <button key={l.id} onClick={() => setActiveLocation(l.id)} className={`px-3 py-1.5 rounded-lg text-sm border transition ${l.id === activeLocation ? 'bg-gradient-to-tr from-indigo-600 to-blue-500 text-white border-transparent' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
                  {l.name}
                </button>
              ))}
            </div>
          </Card>

          <div className='mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6'>
            <div className='lg:col-span-5 space-y-4'>
              <Card className='p-5'>
                <div className='font-semibold text-lg flex items-center gap-2'>
                  <MapPin className='w-5 h-5' /> {location.name}
                </div>
                <div className='mt-1 text-slate-600 text-sm'>
                  <div>{location.address[0]}</div>
                  <div>{location.address[1]}</div>
                </div>
                <div className='mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2'>
                  <ActionButton href={`tel:${onlyDigits(location.phone)}`} icon={Phone} label='Call' detail={location.phone} />
                  <ActionButton href={`https://wa.me/${digitsForWa(location.whatsapp)}`} icon={MessageSquare} label='WhatsApp' detail='Chat now' />
                  <ActionButton href={`mailto:${location.email}`} icon={Mail} label='Email' detail={location.email} />
                  <ActionButton href={location.mapsLink} icon={NavIcon} label='Directions' detail={location.city} />
                </div>
              </Card>

              <Card className='p-5'>
                <div className='flex items-center justify-between'>
                  <div className='font-semibold text-lg flex items-center gap-2'>
                    <Clock className='w-5 h-5' /> Opening hours
                  </div>
                  <StatusPill status={status} />
                </div>
                <HoursTable hours={location.hours} />
              </Card>

              <Card className='p-5' id='trial'>
                <div className='font-semibold text-lg'>Book a free trial</div>
                <p className='text-sm text-slate-600 mt-0.5'>We usually reply within the same business day.</p>
                <ContactForm toEmail={location.email} defaultBranch={location.name} />
              </Card>
            </div>

            <div className='lg:col-span-7'>
              <Card className='p-0 overflow-hidden'>
                <div className='aspect-[16/9] w-full bg-slate-200'>
                  <iframe title={`Map of ${location.name}`} src={location.mapEmbed} loading='lazy' className='w-full h-full border-0' allowFullScreen referrerPolicy='no-referrer-when-downgrade' />
                </div>
              </Card>
            </div>
          </div>
        </Container>
      </Section>

      {/* ============ Footer ============ */}
      <footer className='mt-auto border-t border-slate-200 bg-white/70'>
        <Container className='py-6 flex flex-col sm:flex-row items-center justify-between gap-3'>
          <div className='text-sm text-slate-600'>© {new Date().getFullYear()} FitStudio. All rights reserved.</div>
          <div className='text-sm'>
            <a href='#pricing' className='hover:underline'>
              Pricing
            </a>
            <span className='mx-2'>•</span>
            <a href='#contact' className='hover:underline'>
              Contact
            </a>
          </div>
        </Container>
      </footer>
    </div>
  );
}

/* ================= Helpers & Small Components ================= */
function onlyDigits(s = '') {
  return s.replace(/[^+\d]/g, '');
}
function digitsForWa(s = '') {
  return s.replace(/[^\d]/g, '');
}

function StatusPill({ status }) {
  if (!status) return null;
  const { open, until, nextOpen } = status;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] ring-1 ${open ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-rose-50 text-rose-700 ring-rose-100'}`}>
      <CheckCircle2 className={`w-3.5 h-3.5 ${open ? 'text-emerald-600' : 'text-rose-600'}`} />
      {open ? `Open now • until ${until}` : `Closed • opens ${nextOpen}`}
    </span>
  );
}

function HoursTable({ hours }) {
  const todayIdx = new Date().getDay(); // 0=Sun
  return (
    <div className='mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden'>
      {DAYS.map((d, i) => {
        const row = hours[d];
        const isToday = i === todayIdx;
        return (
          <div key={d} className={`flex items-center justify-between px-4 py-2 text-sm ${isToday ? 'bg-slate-50' : ''}`}>
            <div className='font-medium text-slate-800'>{d}</div>
            <div className='text-slate-700'>{row ? `${row[0]} – ${row[1]}` : 'Closed'}</div>
          </div>
        );
      })}
    </div>
  );
}

function ActionButton({ href, icon: Icon, label, detail }) {
  return (
    <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} className='group inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50'>
      <Icon className='w-4 h-4 text-indigo-600' />
      <span className='font-medium'>{label}</span>
      {detail && <span className='text-slate-500'>• {detail}</span>}
    </a>
  );
}

function ContactForm({ toEmail = 'hello@amazinggym.com', defaultBranch }) {
  const [data, setData] = useState({ name: '', email: '', phone: '', branch: defaultBranch || '', message: '' });
  const [sent, setSent] = useState(false);
  function onSubmit(e) {
    e.preventDefault();
    // TODO: POST to your backend / CRM
    console.log('Contact form:', data);
    setSent(true);
  }
  useEffect(() => {
    setData(d => ({ ...d, branch: defaultBranch || '' }));
  }, [defaultBranch]);
  if (sent) return <div className='mt-3 rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700'>Thanks! We received your message and will get back to you shortly.</div>;
  return (
    <form onSubmit={onSubmit} className='mt-3 space-y-3'>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
        <Input placeholder='Full name' required value={data.name} onChange={e => setData(d => ({ ...d, name: e.target.value }))} />
        <Input type='email' placeholder='Email' required value={data.email} onChange={e => setData(d => ({ ...d, email: e.target.value }))} />
      </div>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
        <Input type='tel' placeholder='Phone / WhatsApp' value={data.phone} onChange={e => setData(d => ({ ...d, phone: e.target.value }))} />
        <Input placeholder='Preferred branch' value={data.branch} onChange={e => setData(d => ({ ...d, branch: e.target.value }))} />
      </div>
      <Textarea rows={4} placeholder='How can we help?' value={data.message} onChange={e => setData(d => ({ ...d, message: e.target.value }))} />
      <div className='flex items-center justify-end gap-2'>
        <Button as='a' href={`mailto:${toEmail}`} variant='ghost'>
          Email us
        </Button>
        <Button type='submit'>Send message</Button>
      </div>
    </form>
  );
}

function getOpenStatus(hours) {
  try {
    const now = new Date();
    const day = DAYS[now.getDay()];
    const today = hours?.[day];
    const timeToM = t => {
      const [H, M] = (t || '00:00').split(':').map(Number);
      return H * 60 + M;
    };
    const m = now.getHours() * 60 + now.getMinutes();
    if (!today) {
      for (let i = 1; i <= 7; i++) {
        const d = DAYS[(now.getDay() + i) % 7];
        const slot = hours?.[d];
        if (slot) return { open: false, nextOpen: `${d} ${slot[0]}` };
      }
      return { open: false };
    }
    const [o, c] = today.map(timeToM);
    if (m >= o && m < c) {
      return { open: true, until: minutesToHHMM(c) };
    }
    return { open: false, nextOpen: `${day} ${today[0]}` };
  } catch (e) {
    return null;
  }
}

function minutesToHHMM(x) {
  const H = Math.floor(x / 60)
    .toString()
    .padStart(2, '0');
  const M = (x % 60).toString().padStart(2, '0');
  return `${H}:${M}`;
}

function MiniStep({ icon: Icon, title, text }) {
  return (
    <div className='rounded-lg border border-slate-200 bg-white p-3'>
      <div className='flex items-center gap-2 font-medium'>
        <Icon className='w-4 h-4' /> {title}
      </div>
      <div className='text-xs text-slate-600 mt-1'>{text}</div>
    </div>
  );
}

function PeriodButton({ active, children, ...props }) {
  return (
    <button className={`px-3 py-1.5 rounded-lg text-sm border transition ${active ? 'bg-gradient-to-tr from-indigo-600 to-blue-500 text-white border-transparent' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`} {...props}>
      {children}
    </button>
  );
}

function Price({ amount, unit, period }) {
  const per = period === 'yearly' ? 'yr' : 'mo';
  return (
    <div>
      <div className='text-3xl font-extrabold'>
        {amount}
        <span className='text-base font-medium'>
          {' '}
          {unit}/{per}
        </span>
      </div>
    </div>
  );
}

function Inc({ children }) {
  return (
    <div className='inline-flex items-center gap-2'>
      <ShieldCheck className='w-4 h-4 text-indigo-600' />
      {children}
    </div>
  );
}

function BeforeAfter({ before, after, name }) {
  const [pos, setPos] = useState(50);
  return (
    <div className='relative aspect-[4/3] w-full rounded-lg overflow-hidden select-none bg-slate-200'>
      {before ? <img src={before} alt={`${name} before`} className='absolute inset-0 w-full h-full object-cover' /> : <div className='absolute inset-0 bg-slate-300' />}
      <div className='absolute inset-0' style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {after ? <img src={after} alt={`${name} after`} className='w-full h-full object-cover' /> : <div className='w-full h-full bg-slate-400' />}
      </div>
      <div className='absolute inset-y-0' style={{ left: `${pos}%` }}>
        <div className='h-full w-[2px] bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.1)]' />
        <div className='absolute -top-4 -translate-x-1/2 left-0 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full'>Slide</div>
      </div>
      <input type='range' value={pos} min={0} max={100} onChange={e => setPos(Number(e.target.value))} className='absolute inset-0 opacity-0 cursor-ew-resize' aria-label='Compare before and after' />
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className='rounded-lg border border-slate-200 bg-white p-2'>
      <div className={`inline-flex items-center gap-1 text-[11px] text-slate-500`}>
        <Icon className={`w-3.5 h-3.5`} /> {label}
      </div>
      <div className='mt-1 font-semibold text-slate-800'>{value}</div>
    </div>
  );
}

function Impact({ value }) {
  return (
    <div className='rounded-lg border border-slate-200 bg-white p-2'>
      <div className='inline-flex items-center gap-1 text-[11px] text-slate-500'>
        <Star className='w-3.5 h-3.5 text-amber-500' /> Impact
      </div>
      <div className='mt-1 font-semibold text-slate-800'>+{value}</div>
    </div>
  );
}

function delta(s) {
  const kg = Math.abs(s.endWeight - s.startWeight);
  const bf = Math.abs((s.endBodyFat ?? 0) - (s.startBodyFat ?? 0));
  return Math.round(kg + bf);
}
