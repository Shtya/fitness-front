'use client';

// app/(site)/page.jsx
// Public Website Home: Hero, USP, Social Proof, CTA

import { useState } from 'react';
import { motion } from 'framer-motion';
import TrialModal from '@/components/site/TrialModal';
import { Container, Section, Button, Card, Feature, Badge, spring } from '@/components/site/UI';
import { Dumbbell, Salad, CalendarRange, ShieldCheck, Clock, Sparkles, Users, HeartPulse } from 'lucide-react';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';

const LOGOS = ['/logos/nike.svg', '/logos/rogue.svg', '/logos/garmin.svg', '/logos/fitbit.svg']; // replace with real logos or remove

const TESTIMONIALS = [
  { name: 'Mahmoud A.', role: 'Member — 8 months', quote: 'Lost 9 kg and hit my first 100kg squat. The coaches keep me accountable without being pushy.' },
  { name: 'Nour H.', role: 'PT Client — 3 months', quote: 'Nutrition templates + weekly check‑ins made it easy to stay on track even during Ramadan.' },
  { name: 'Omar S.', role: 'Online Coaching — 6 months', quote: 'Clear programming, fast form checks, and a real community. Best decision I made this year.' },
];

export default function HomePage() {
  const [open, setOpen] = useState(false);

  return (
    <div className='min-h-dvh flex flex-col bg-gradient-to-b from-white to-slate-50'>
      <SiteHeader />
      {/* ================= HERO ================= */}
      <Section className='pt-18 sm:pt-22'>
        <Container>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 items-center'>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
              <Badge>Results-driven fitness in Cairo</Badge>
              <h1 className='mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight'>Stronger. Leaner. Happier.</h1>
              <p className='mt-3 text-slate-600 text-lg'>Gym classes, personal training, online coaching, and nutrition — all in one platform.</p>
              <div className='mt-6 flex flex-wrap gap-3'>
                <Button onClick={() => setOpen(true)}>Book a free trial</Button>
                <Button as='a' href='/site/pricing' variant='ghost'>
                  See pricing
                </Button>
              </div>
              <div className='mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <Feature icon={Dumbbell} title='Smart programming'>
                  Periodized plans that adapt to your progress.
                </Feature>
                <Feature icon={Salad} title='Nutrition coaching'>
                  Meal plans, recipes, and habit tracking.
                </Feature>
                <Feature icon={CalendarRange} title='Flexible schedule'>
                  Classes every day — morning to evening.
                </Feature>
                <Feature icon={ShieldCheck} title='Certified coaches'>
                  REPs-certified trainers & nutritionists.
                </Feature>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.05 }}>
              <Card className='p-4 h-full grid place-items-center'>
                <div className='aspect-video w-full rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500' />
                <div className='mt-3 text-sm text-slate-500'>Tour our facility (video)</div>
              </Card>
            </motion.div>
          </div>

          {/* Social proof strip */}
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className='mt-12 flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
            <div className='text-sm text-slate-600'>
              <span className='text-base'>★★★★★</span> Rated <span className='font-semibold'>4.9/5</span> by 300+ members
            </div>
            <div className='flex flex-wrap items-center gap-6 opacity-80'>
              {LOGOS.map((src, i) => (
                <div key={i} className='h-8 w-24 bg-slate-200 rounded' title='Partner logo' />
              ))}
            </div>
          </motion.div>
        </Container>
      </Section>

      {/* ================= USP / FEATURES ================= */}
      <Section>
        <Container>
          <div className='text-center'>
            <h2 className='text-2xl sm:text-3xl font-extrabold'>Everything you need to succeed</h2>
            <p className='mt-2 text-slate-600'>Programming + nutrition + accountability in one place.</p>
          </div>
          <div className='mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6'>
            <Card className='p-5'>
              <Feature icon={Dumbbell} title='Smart programming'>
                Periodized plans that adapt to your progress with weekly check‑ins.
              </Feature>
            </Card>
            <Card className='p-5'>
              <Feature icon={Salad} title='Nutrition coaching'>
                Meal templates, recipe library, and grocery lists tailored to your macros.
              </Feature>
            </Card>
            <Card className='p-5'>
              <Feature icon={Users} title='Small classes'>
                Coaching attention without the crowd — beginner friendly.
              </Feature>
            </Card>
            <Card className='p-5'>
              <Feature icon={CalendarRange} title='Flexible schedule'>
                Morning & evening classes — reschedule or join waitlists easily.
              </Feature>
            </Card>
          </div>
        </Container>
      </Section>

      {/* ================= TESTIMONIALS ================= */}
      <Section>
        <Container>
          <div className='text-center'>
            <h2 className='text-2xl sm:text-3xl font-extrabold'>Real members. Real results.</h2>
            <p className='mt-2 text-slate-600'>Join a community that lifts you up — literally.</p>
          </div>
          <div className='mt-8 grid grid-cols-1 md:grid-cols-3 gap-5'>
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ ...spring, delay: i * 0.03 }}>
                <Card className='p-5'>
                  <div className='text-slate-800'>“{t.quote}”</div>
                  <div className='mt-3 text-sm text-slate-600'>
                    {t.name} • {t.role}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </Container>
      </Section>

      {/* ================= FINAL CTA ================= */}
      <Section className='py-10'>
        <Container>
          <Card className='p-5 flex flex-col sm:flex-row items-center justify-between'>
            <div>
              <div className='font-semibold'>Ready to start?</div>
              <div className='text-slate-600 text-sm'>Book your free trial and meet your coach this week.</div>
            </div>
            <div className='flex gap-2 mt-3 sm:mt-0'>
              <Button onClick={() => setOpen(true)}>Book a trial</Button>
              <Button as='a' href='/site/schedule' variant='ghost'>
                See class schedule
              </Button>
            </div>
          </Card>
        </Container>
      </Section>

      <TrialModal open={open} onClose={() => setOpen(false)} />
      <SiteFooter />
    </div>
  );
}
