/*
 * ============================================================
 * COACH LANDING PAGE — page.jsx
 * ============================================================
 *
 * IMAGE KEYS TO REPLACE (all in `images` object at top of file):
 *   hero          — coach hero portrait (tall, editorial crop)
 *   about         — coach about section image
 *   service1      — online coaching service image
 *   service2      — nutrition coaching image
 *   service3      — transformation program image
 *   featuredBefore — featured transformation before image
 *   featuredAfter  — featured transformation after image
 *   t1Before / t1After — transformation card 1
 *   t2Before / t2After — transformation card 2
 *   t3Before / t3After — transformation card 3
 *   t4Before / t4After — transformation card 4
 *   testimonial1..6   — testimonial profile photos
 *
 * FONT CLASSES USED:
 *   font-display  — bold campaign / headline font (configured in tailwind)
 *   font-body     — refined body / paragraph font (configured in tailwind)
 *
 * LOCALIZATION STRATEGY:
 *   useLocale() from next-intl to get active locale ("ar" | "en")
 *   All copy lives in `content.ar` and `content.en` — zero scattered text in JSX
 *
 * GSAP PLUGINS:
 *   gsap (core)
 *   ScrollTrigger
 * ============================================================
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useLocale } from "next-intl";

// ─────────────────────────────────────────────
// IMAGES — replace URLs here, never in JSX
// ─────────────────────────────────────────────
const images = {
  hero: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=900&q=85&fit=crop",
  about: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=85&fit=crop",
  service1: "https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=700&q=80&fit=crop",
  service2: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=700&q=80&fit=crop",
  service3: "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=700&q=80&fit=crop",
  featuredBefore: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80&fit=crop",
  featuredAfter: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&q=80&fit=crop",
  t1Before: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=500&q=80&fit=crop",
  t1After: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=500&q=80&fit=crop",
  t2Before: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&q=80&fit=crop",
  t2After: "https://images.unsplash.com/photo-1571731956672-f2b94d7dd0cb?w=500&q=80&fit=crop",
  t3Before: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=500&q=80&fit=crop",
  t3After: "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=500&q=80&fit=crop",
  t4Before: "https://images.unsplash.com/photo-1530822847156-5df684ec5ee1?w=500&q=80&fit=crop",
  t4After: "https://images.unsplash.com/photo-1581009137042-c552e485697a?w=500&q=80&fit=crop",
  testimonial1: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=80&fit=crop&crop=faces",
  testimonial2: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80&fit=crop&crop=faces",
  testimonial3: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80&fit=crop&crop=faces",
  testimonial4: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&q=80&fit=crop&crop=faces",
  testimonial5: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&q=80&fit=crop&crop=faces",
  testimonial6: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=80&fit=crop&crop=faces",
};

// ─────────────────────────────────────────────
// LOCALIZED CONTENT
// ─────────────────────────────────────────────
const content = {
  en: {
    nav: {
      logo: "KARIM",
      tagline: "COACH",
      links: ["About", "Method", "Programs", "Results", "Pricing"],
      cta: "Start Now",
      lang: "عربي",
    },
    hero: {
      eyebrow: "Elite Fitness Coaching",
      headline1: "Built Different.",
      headline2: "Coached",
      headline3: "Right.",
      sub: "No templates. No guesswork. A fully structured plan built around your body, your schedule, and your goals.",
      cta1: "Book Your Free Call",
      cta2: "See Transformations",
      badge1: "500+ Clients Coached",
      badge2: "Certified Specialist",
      imageAlt: "Coach Karim — Elite Fitness Trainer",
    },
    trust: [
      { value: "8+", label: "Years Experience" },
      { value: "500+", label: "Transformations" },
      { value: "4.9★", label: "Average Rating" },
      { value: "IFBB", label: "Certified Judge" },
      { value: "12", label: "Countries Served" },
    ],
    marquee: [
      "NSCA Certified", "Evidence-Based Training", "500+ Transformations",
      "Precision Nutrition", "12 Countries Served", "Online & In-Person",
      "Body Recomposition", "Strength Programming", "Habit-Driven Results",
    ],
    stats: [
      { num: 500, suffix: "+", label: "Clients Transformed" },
      { num: 8, suffix: " Years", label: "Elite Coaching" },
      { num: 97, suffix: "%", label: "Client Retention" },
      { num: 12, suffix: "", label: "Countries" },
    ],
    about: {
      eyebrow: "The Coach",
      headline: "I don't sell promises. I build systems.",
      body1: "I'm Karim — a certified strength & nutrition coach with over 8 years working with athletes, busy professionals, and people who tried everything else and got tired of the noise.",
      body2: "My approach is direct: deep assessment, honest goal-setting, and a structured program that gets adjusted every week based on real data — not feelings.",
      quote: "The best program is one you'll follow. My job is to build that for you and hold you to it.",
      certs: ["NSCA-CPT", "Precision Nutrition L2", "IFBB Certified", "Sports Science BSc"],
      imageAlt: "Karim — About The Coach",
    },
    why: {
      eyebrow: "Why Work With Me",
      headline: "The gap between effort and results is usually a plan problem.",
      items: [
        { title: "Precision Programming", desc: "Every session is built around your body, not a recycled template." },
        { title: "Science-Backed Nutrition", desc: "Practical food strategies — no elimination diets, no gimmicks." },
        { title: "Real Accountability", desc: "Weekly check-ins with data review, not just motivational messages." },
        { title: "Adjustments That Matter", desc: "Your plan evolves weekly based on what's actually working." },
        { title: "Direct Coach Access", desc: "You reach me directly. No assistants, no ticketing system." },
        { title: "Tested on Real People", desc: "Every method I use has been validated across 500+ different clients." },
      ],
    },
    forWho: {
      eyebrow: "Who This Is For",
      headline: "This coaching works for specific people.",
      items: [
        { label: "Fat Loss", desc: "Structured deficit protocols that preserve muscle and maintain energy." },
        { label: "Muscle Gain", desc: "Progressive overload, recovery focus, and calorie precision." },
        { label: "Body Recomposition", desc: "Losing fat and gaining muscle simultaneously — done correctly." },
        { label: "Beginners", desc: "Start strong with the right habits and movement foundations." },
        { label: "Busy Professionals", desc: "Efficient training designed around a real schedule." },
        { label: "Online Clients", desc: "Full remote support with the same rigor as in-person." },
      ],
    },
    method: {
      eyebrow: "How It Works",
      headline: "A clear process. No vague steps.",
      steps: [
        { num: "01", title: "Deep Assessment", desc: "Goals, history, lifestyle, schedule, and baseline measurements — before anything is designed." },
        { num: "02", title: "Custom Plan Build", desc: "A tailored training program and nutrition setup created specifically for your body and goals." },
        { num: "03", title: "Week 1 Execution", desc: "You start with clear sessions, exact targets, and tracked macros from day one." },
        { num: "04", title: "Weekly Check-ins", desc: "Progress photos, bodyweight trends, and performance data reviewed every 7 days." },
        { num: "05", title: "Plan Adjustments", desc: "Your program is updated based on real results — not a fixed calendar." },
        { num: "06", title: "Ongoing Support", desc: "Direct coach access for questions, modifications, and accountability between check-ins." },
      ],
    },
    services: {
      eyebrow: "Programs",
      headline: "Three structures. One standard.",
      items: [
        {
          num: "01",
          title: "Online Coaching",
          sub: "Full Remote Program",
          desc: "Custom training and nutrition plan, weekly check-ins, and direct messaging access. Built to run entirely online with no compromise in quality.",
          cta: "Apply Now",
          imageAlt: "Online Coaching",
        },
        {
          num: "02",
          title: "Nutrition Only",
          sub: "Precision Nutrition Plan",
          desc: "A complete nutrition system with calorie targets, macro splits, meal timing, and a practical food guide. No rigid meal plans — a system you can actually sustain.",
          cta: "Get Started",
          imageAlt: "Nutrition Coaching",
        },
        {
          num: "03",
          title: "Transformation Program",
          sub: "12-Week Intensive",
          desc: "The full system: custom training, full nutrition setup, weekly accountability, and priority support. Designed for clients who are fully committed to a real result in 12 weeks.",
          cta: "Join The Program",
          imageAlt: "Transformation Program",
        },
      ],
    },
    featured: {
      eyebrow: "Featured Result",
      headline: "23kg down. 9 months. No surgery.",
      story: "Ahmed came in with 8 years of failed diets behind him. We reset his approach entirely — realistic deficit, structured strength training, and consistent check-ins. The result wasn't luck. It was a system.",
      stats: [
        { val: "23kg", label: "Weight Lost" },
        { val: "9 mo", label: "Duration" },
        { val: "+18%", label: "Strength Gain" },
        { val: "0", label: "Cheat Weeks" },
      ],
      beforeLabel: "Before",
      afterLabel: "After",
      clientName: "Ahmed M., 34 — Cairo",
    },
    transformations: {
      eyebrow: "Transformations",
      headline: "Results that hold.",
      beforeLabel: "Before",
      afterLabel: "After",
      items: [
        { name: "Sara K.", duration: "6 months", goal: "Fat Loss", stats: ["-14kg", "+Body Tone", "Full Energy"] },
        { name: "Omar T.", duration: "8 months", goal: "Muscle Gain", stats: ["+9kg Muscle", "-6% BF", "PR Every Month"] },
        { name: "Lina R.", duration: "5 months", goal: "Recomposition", stats: ["-11kg Fat", "+Lean Mass", "Better Sleep"] },
        { name: "Yousef A.", duration: "12 weeks", goal: "Body Cut", stats: ["-8kg", "+Visible Abs", "Energy Stable"] },
      ],
    },
    testimonials: {
      eyebrow: "Clients",
      headline: "Not reviews. Outcomes.",
      items: [
        { name: "Ahmed M.", detail: "34 — Cairo", quote: "I spent 4 years trying different things. In 9 months with Karim I lost 23kg and I actually understand why it worked this time.", img: images.testimonial1 },
        { name: "Sara K.", detail: "28 — Dubai", quote: "The nutrition plan alone changed everything. I didn't cut anything out. I just learned how to eat properly for the first time.", img: images.testimonial2 },
        { name: "Omar T.", detail: "31 — Riyadh", quote: "Every week the plan got sharper. I've never had a coach who actually looked at my data and changed things based on it.", img: images.testimonial3 },
        { name: "Lina R.", detail: "26 — London", quote: "The check-ins kept me honest. I couldn't ghost the process because the numbers were right there every Sunday.", img: images.testimonial4 },
        { name: "Yousef A.", detail: "29 — Amman", quote: "12 weeks. I went from avoiding mirrors to genuinely proud of how I look. That's not an exaggeration.", img: images.testimonial5 },
        { name: "Nadia S.", detail: "35 — Berlin", quote: "I was skeptical about online coaching. The level of attention I got remotely was better than any gym trainer I've had in person.", img: images.testimonial6 },
      ],
    },
    resources: {
      eyebrow: "Resources",
      headline: "Tools included with every program.",
      items: [
        { title: "Calorie Calculator", desc: "A precise TDEE breakdown based on your stats, activity, and goal phase — not a generic formula." },
        { title: "Food Swaps Guide", desc: "A practical list of high-protein, lower-calorie alternatives for your favourite local foods." },
        { title: "Macro Tracking Guide", desc: "Step-by-step setup for tracking food without obsessing over every gram." },
        { title: "Grocery Planning", desc: "Weekly shop lists built around your nutrition targets and food preferences." },
        { title: "Progress Tracking Sheet", desc: "A simple weekly log for weight, energy, sleep, and training performance." },
        { title: "Supplement Guide", desc: "What actually works, what's a waste of money, and what you may genuinely need." },
      ],
    },
    pricing: {
      eyebrow: "Pricing",
      headline: "Clear structure. No hidden costs.",
      note: "All packages are monthly. Cancel or pause anytime after the first cycle.",
      tiers: [
        {
          name: "Nutrition Only",
          price: "$89",
          period: "/month",
          highlight: false,
          features: [
            "Custom Calorie & Macro Targets",
            "Practical Food Guide",
            "Grocery List Templates",
            "Bi-weekly Check-in",
            "Direct Messaging",
          ],
          cta: "Get Started",
        },
        {
          name: "Online Coaching",
          price: "$149",
          period: "/month",
          highlight: true,
          badge: "Most Popular",
          features: [
            "Custom Training Program",
            "Full Nutrition Plan",
            "Weekly Check-in + Data Review",
            "Plan Adjustments Every Week",
            "Direct Coach Access",
            "Progress Photo Review",
          ],
          cta: "Start Coaching",
        },
        {
          name: "Transformation Program",
          price: "$249",
          period: "/month",
          highlight: false,
          features: [
            "Everything in Online Coaching",
            "12-Week Structured Timeline",
            "Priority Response (24h)",
            "Monthly Video Call",
            "Supplement Guidance",
            "Habit & Lifestyle Coaching",
          ],
          cta: "Apply Now",
        },
      ],
    },
    faq: {
      eyebrow: "FAQ",
      headline: "Common questions.",
      items: [
        { q: "Do I need a gym membership?", a: "Not necessarily. Programs can be built around a home gym, a commercial gym, or minimal equipment — depending on what you have access to and what your goals require." },
        { q: "How does online coaching actually work?", a: "After onboarding, you receive your program and nutrition setup. Every week you send check-in data — weight, photos, and how training felt. I review it and update your plan within 24 hours." },
        { q: "I've tried everything and nothing worked. Why would this be different?", a: "Most programs fail because they're not personalized and they don't adjust. This is built specifically for you and changes weekly based on actual data — not a preset calendar." },
        { q: "Can I do this while eating out or travelling?", a: "Yes. Practical flexibility is built into the nutrition setup from day one. The system works around your real life, not against it." },
        { q: "What if I stop seeing results?", a: "That's exactly what check-ins are for. If progress stalls, we diagnose and adjust — whether that's training volume, calorie targets, recovery, or something else entirely." },
        { q: "Is there a minimum commitment?", a: "The minimum is one monthly cycle. I won't lock you into long contracts. If you stay, it's because it's working." },
      ],
    },
    cta: {
      headline1: "The plan won't build itself.",
      headline2: "Let's start yours.",
      sub: "Book a free 20-minute call. No pressure. Just clarity on what's possible.",
      cta: "Book Your Free Call",
      trust: "No commitment required. 100% remote available.",
    },
    footer: {
      tagline: "Precision coaching for real results.",
      colLinks: "Navigation",
      colContact: "Contact",
      links: ["About", "Method", "Programs", "Results", "Pricing", "FAQ"],
      email: "coach@karimfitness.com",
      phone: "+20 100 000 0000",
      social: ["Instagram", "YouTube", "TikTok"],
      copy: "© 2025 Karim Fitness. All rights reserved.",
      lang: "عربي",
    },
  },

  ar: {
    nav: {
      logo: "كريم",
      tagline: "كوتش",
      links: ["من أنا", "المنهج", "البرامج", "النتائج", "الأسعار"],
      cta: "ابدأ الآن",
      lang: "English",
    },
    hero: {
      eyebrow: "تدريب رياضي احترافي",
      headline1: "بُني بشكل مختلف.",
      headline2: "تدريب",
      headline3: "صحيح.",
      sub: "لا خطط جاهزة. لا تخمينات. خطة كاملة مبنية على جسمك وجدولك وأهدافك.",
      cta1: "احجز مكالمتك المجانية",
      cta2: "شاهد التحولات",
      badge1: "+500 عميل تم تدريبهم",
      badge2: "مدرب معتمد",
      imageAlt: "المدرب كريم — مدرب لياقة احترافي",
    },
    trust: [
      { value: "+8", label: "سنوات خبرة" },
      { value: "+500", label: "تحولات" },
      { value: "4.9★", label: "متوسط التقييم" },
      { value: "IFBB", label: "حكم معتمد" },
      { value: "12", label: "دولة" },
    ],
    marquee: [
      "معتمد NSCA", "تدريب قائم على العلم", "+500 تحول", "تغذية دقيقة",
      "12 دولة", "أونلاين وحضوري", "إعادة تشكيل الجسم", "برمجة قوة", "نتائج ثابتة",
    ],
    stats: [
      { num: 500, suffix: "+", label: "عميل تم تحويله" },
      { num: 8, suffix: " سنوات", label: "تدريب احترافي" },
      { num: 97, suffix: "%", label: "نسبة الاستمرار" },
      { num: 12, suffix: "", label: "دولة" },
    ],
    about: {
      eyebrow: "المدرب",
      headline: "لا أبيع وعوداً. أبني أنظمة.",
      body1: "أنا كريم — مدرب لياقة وتغذية معتمد مع أكثر من 8 سنوات عمل مع رياضيين ومحترفين مشغولين وأشخاص جربوا كل شيء وسئموا من الضوضاء.",
      body2: "نهجي مباشر: تقييم عميق، وضع أهداف واقعية، وبرنامج منظم يُعدَّل كل أسبوع بناءً على بيانات حقيقية — وليس مشاعر.",
      quote: "البرنامج الأفضل هو الذي ستلتزم به. مهمتي هي بناء ذلك لك والمطالبة بك به.",
      certs: ["NSCA-CPT", "Precision Nutrition L2", "IFBB Certified", "BSc علوم الرياضة"],
      imageAlt: "كريم — عن المدرب",
    },
    why: {
      eyebrow: "لماذا أتدرب معي",
      headline: "الفجوة بين الجهد والنتائج هي عادةً مشكلة خطة.",
      items: [
        { title: "برمجة دقيقة", desc: "كل جلسة مبنية حول جسمك، وليس قالباً معاداً." },
        { title: "تغذية قائمة على العلم", desc: "استراتيجيات غذائية عملية — لا حميات استئصالية، لا خدع." },
        { title: "مساءلة حقيقية", desc: "متابعة أسبوعية مع مراجعة البيانات، وليس مجرد رسائل تحفيزية." },
        { title: "تعديلات تُحدث فرقاً", desc: "خطتك تتطور أسبوعياً بناءً على ما يعمل فعلاً." },
        { title: "وصول مباشر للمدرب", desc: "تتواصل معي مباشرةً. بدون مساعدين، بدون نظام تذاكر." },
        { title: "مُختبر على أشخاص حقيقيين", desc: "كل طريقة أستخدمها تم التحقق منها عبر أكثر من 500 عميل مختلف." },
      ],
    },
    forWho: {
      eyebrow: "لمن هذا التدريب",
      headline: "هذا التدريب يناسب أشخاصاً بعينهم.",
      items: [
        { label: "خسارة الدهون", desc: "بروتوكولات عجز منظمة تحافظ على العضلات وتحافظ على الطاقة." },
        { label: "بناء العضل", desc: "حمل تدريجي، وتركيز على التعافي، ودقة في السعرات الحرارية." },
        { label: "إعادة تشكيل الجسم", desc: "خسارة الدهون وبناء العضل في نفس الوقت — بشكل صحيح." },
        { label: "المبتدئون", desc: "ابدأ بقوة مع العادات الصحيحة وأسس الحركة." },
        { label: "المحترفون المشغولون", desc: "تدريب فعال مصمم حول جدول حقيقي." },
        { label: "العملاء عن بُعد", desc: "دعم كامل عن بُعد بنفس الصرامة الحضورية." },
      ],
    },
    method: {
      eyebrow: "كيف يعمل",
      headline: "عملية واضحة. لا خطوات مبهمة.",
      steps: [
        { num: "01", title: "تقييم عميق", desc: "الأهداف والتاريخ ونمط الحياة والجدول والقياسات الأساسية — قبل أي تصميم." },
        { num: "02", title: "بناء خطة مخصصة", desc: "برنامج تدريبي وإعداد تغذية مصمم خصيصاً لجسمك وأهدافك." },
        { num: "03", title: "تنفيذ الأسبوع الأول", desc: "تبدأ بجلسات واضحة وأهداف محددة وماكروز محسوبة من اليوم الأول." },
        { num: "04", title: "متابعة أسبوعية", desc: "صور التقدم واتجاهات وزن الجسم وبيانات الأداء تُراجع كل 7 أيام." },
        { num: "05", title: "تعديل الخطة", desc: "يُحدَّث برنامجك بناءً على نتائج حقيقية — وليس تقويماً ثابتاً." },
        { num: "06", title: "دعم مستمر", desc: "وصول مباشر للمدرب للأسئلة والتعديلات والمساءلة بين المتابعات." },
      ],
    },
    services: {
      eyebrow: "البرامج",
      headline: "ثلاثة هياكل. معيار واحد.",
      items: [
        {
          num: "01",
          title: "التدريب عبر الإنترنت",
          sub: "برنامج عن بُعد كامل",
          desc: "خطة تدريب وتغذية مخصصة، متابعة أسبوعية، ووصول مباشر للمراسلة. مبني للعمل عبر الإنترنت بالكامل دون أي تنازل في الجودة.",
          cta: "قدّم الآن",
          imageAlt: "التدريب عبر الإنترنت",
        },
        {
          num: "02",
          title: "التغذية فقط",
          sub: "خطة تغذية دقيقة",
          desc: "نظام تغذية كامل مع أهداف سعرات، توزيع ماكروز، توقيت وجبات، ودليل غذائي عملي. لا خطط وجبات صارمة — نظام يمكنك فعلاً الاستمرار فيه.",
          cta: "ابدأ الآن",
          imageAlt: "التدريب الغذائي",
        },
        {
          num: "03",
          title: "برنامج التحول",
          sub: "مكثف 12 أسبوع",
          desc: "النظام الكامل: تدريب مخصص، إعداد تغذية كامل، مساءلة أسبوعية، ودعم ذو أولوية. مصمم للعملاء الملتزمين تماماً بنتيجة حقيقية في 12 أسبوعاً.",
          cta: "انضم للبرنامج",
          imageAlt: "برنامج التحول",
        },
      ],
    },
    featured: {
      eyebrow: "نتيجة مميزة",
      headline: "23 كيلو أقل. 9 أشهر. بدون جراحة.",
      story: "جاء أحمد مع 8 سنوات من الحميات الفاشلة خلفه. أعدنا ضبط نهجه بالكامل — عجز واقعي، تدريب قوة منظم، ومتابعة منتظمة. النتيجة لم تكن حظاً. كانت نظاماً.",
      stats: [
        { val: "23kg", label: "وزن مفقود" },
        { val: "9 أشهر", label: "المدة" },
        { val: "+18%", label: "زيادة القوة" },
        { val: "0", label: "أسابيع انقطاع" },
      ],
      beforeLabel: "قبل",
      afterLabel: "بعد",
      clientName: "أحمد م.، 34 — القاهرة",
    },
    transformations: {
      eyebrow: "التحولات",
      headline: "نتائج تدوم.",
      beforeLabel: "قبل",
      afterLabel: "بعد",
      items: [
        { name: "سارة ك.", duration: "6 أشهر", goal: "خسارة دهون", stats: ["-14كج", "+تشكيل", "طاقة كاملة"] },
        { name: "عمر ت.", duration: "8 أشهر", goal: "بناء عضل", stats: ["+9كج عضل", "-6% دهون", "أرقام قياسية"] },
        { name: "لينا ر.", duration: "5 أشهر", goal: "إعادة تشكيل", stats: ["-11كج دهون", "+كتلة عضلية", "نوم أفضل"] },
        { name: "يوسف أ.", duration: "12 أسبوع", goal: "تخفيف", stats: ["-8كج", "+عضلات ظاهرة", "طاقة مستقرة"] },
      ],
    },
    testimonials: {
      eyebrow: "العملاء",
      headline: "ليست مراجعات. نتائج.",
      items: [
        { name: "أحمد م.", detail: "34 — القاهرة", quote: "أمضيت 4 سنوات أجرب أشياء مختلفة. في 9 أشهر مع كريم أنقصت 23 كيلو وأفهم فعلاً لماذا نجح الأمر هذه المرة.", img: images.testimonial1 },
        { name: "سارة ك.", detail: "28 — دبي", quote: "خطة التغذية وحدها غيّرت كل شيء. لم أقطع أي شيء. فقط تعلمت كيف آكل بشكل صحيح لأول مرة.", img: images.testimonial2 },
        { name: "عمر ت.", detail: "31 — الرياض", quote: "كل أسبوع كانت الخطة تصبح أكثر دقة. لم يكن لدي مدرب يراجع بياناتي فعلاً ويغير الأشياء بناءً عليها.", img: images.testimonial3 },
        { name: "لينا ر.", detail: "26 — لندن", quote: "المتابعات أبقتني صادقاً مع نفسي. لم أستطع التملص من العملية لأن الأرقام كانت أمامي كل أحد.", img: images.testimonial4 },
        { name: "يوسف أ.", detail: "29 — عمّان", quote: "12 أسبوع. انتقلت من تجنب المرايا إلى الفخر الحقيقي بمظهري. هذا ليس مبالغة.", img: images.testimonial5 },
        { name: "نادية س.", detail: "35 — برلين", quote: "كنت متشككاً في التدريب عن بُعد. مستوى الاهتمام الذي حصلت عليه عن بُعد كان أفضل من أي مدرب في صالة رياضية.", img: images.testimonial6 },
      ],
    },
    resources: {
      eyebrow: "الموارد",
      headline: "أدوات مضمّنة مع كل برنامج.",
      items: [
        { title: "حاسبة السعرات", desc: "تفصيل TDEE دقيق بناءً على إحصائياتك ونشاطك ومرحلة هدفك — وليس صيغة عامة." },
        { title: "دليل بدائل الطعام", desc: "قائمة عملية من البدائل الغنية بالبروتين وقليلة السعرات لأطعمتك المحلية المفضلة." },
        { title: "دليل تتبع الماكروز", desc: "إعداد خطوة بخطوة لتتبع الطعام دون الهوس بكل غرام." },
        { title: "تخطيط التسوق", desc: "قوائم تسوق أسبوعية مبنية حول أهدافك الغذائية وتفضيلاتك الغذائية." },
        { title: "ورقة تتبع التقدم", desc: "سجل أسبوعي بسيط للوزن والطاقة والنوم وأداء التدريب." },
        { title: "دليل المكملات", desc: "ما يعمل فعلاً، وما هو مضيعة للمال، وما قد تحتاجه فعلاً." },
      ],
    },
    pricing: {
      eyebrow: "الأسعار",
      headline: "هيكل واضح. لا تكاليف خفية.",
      note: "جميع الباقات شهرية. يمكنك الإلغاء أو التوقف المؤقت في أي وقت بعد الدورة الأولى.",
      tiers: [
        {
          name: "التغذية فقط",
          price: "$89",
          period: "/شهر",
          highlight: false,
          features: ["أهداف سعرات وماكروز مخصصة", "دليل غذائي عملي", "قوائم تسوق نموذجية", "متابعة كل أسبوعين", "مراسلة مباشرة"],
          cta: "ابدأ الآن",
        },
        {
          name: "التدريب عبر الإنترنت",
          price: "$149",
          period: "/شهر",
          highlight: true,
          badge: "الأكثر شعبية",
          features: ["برنامج تدريب مخصص", "خطة تغذية كاملة", "متابعة أسبوعية + مراجعة بيانات", "تعديلات على الخطة كل أسبوع", "وصول مباشر للمدرب", "مراجعة صور التقدم"],
          cta: "ابدأ التدريب",
        },
        {
          name: "برنامج التحول",
          price: "$249",
          period: "/شهر",
          highlight: false,
          features: ["كل شيء في التدريب عبر الإنترنت", "جدول زمني منظم لـ12 أسبوع", "استجابة ذات أولوية (24 ساعة)", "مكالمة فيديو شهرية", "توجيه المكملات", "تدريب العادات ونمط الحياة"],
          cta: "قدّم الآن",
        },
      ],
    },
    faq: {
      eyebrow: "الأسئلة الشائعة",
      headline: "أسئلة متكررة.",
      items: [
        { q: "هل أحتاج عضوية صالة رياضية؟", a: "ليس بالضرورة. يمكن بناء البرامج حول صالة منزلية أو صالة تجارية أو معدات محدودة — بناءً على ما تصل إليه وما تتطلبه أهدافك." },
        { q: "كيف يعمل التدريب عبر الإنترنت فعلاً؟", a: "بعد التسجيل، تتلقى برنامجك وإعداد التغذية. كل أسبوع ترسل بيانات المتابعة — الوزن والصور وكيف كان التدريب. أراجعها وأحدّث خطتك خلال 24 ساعة." },
        { q: "جربت كل شيء ولم ينجح شيء. لماذا سيكون هذا مختلفاً؟", a: "معظم البرامج تفشل لأنها غير مخصصة ولا تتكيف. هذا مبني خصيصاً لك ويتغير أسبوعياً بناءً على بيانات فعلية — وليس تقويماً محدداً مسبقاً." },
        { q: "هل يمكنني الالتزام أثناء تناول الطعام بالخارج أو السفر؟", a: "نعم. المرونة العملية مدمجة في إعداد التغذية من اليوم الأول. النظام يعمل حول حياتك الحقيقية، وليس ضدها." },
        { q: "ماذا لو توقفت عن رؤية نتائج؟", a: "هذا بالضبط ما المتابعات من أجله. إذا توقف التقدم، نشخص ونعدل — سواء كان ذلك حجم التدريب أو أهداف السعرات أو التعافي أو أي شيء آخر." },
        { q: "هل هناك حد أدنى للالتزام؟", a: "الحد الأدنى هو دورة شهرية واحدة. لن أقيدك بعقود طويلة. إذا استمررت، فلأنه يعمل." },
      ],
    },
    cta: {
      headline1: "الخطة لن تبني نفسها.",
      headline2: "لنبدأ خطتك.",
      sub: "احجز مكالمة مجانية لمدة 20 دقيقة. لا ضغط. فقط وضوح حول ما هو ممكن.",
      cta: "احجز مكالمتك المجانية",
      trust: "لا التزام مطلوب. متاح 100% عن بُعد.",
    },
    footer: {
      tagline: "تدريب دقيق لنتائج حقيقية.",
      colLinks: "التنقل",
      colContact: "التواصل",
      links: ["من أنا", "المنهج", "البرامج", "النتائج", "الأسعار", "الأسئلة"],
      email: "coach@karimfitness.com",
      phone: "+20 100 000 0000",
      social: ["إنستغرام", "يوتيوب", "تيك توك"],
      copy: "© 2025 كريم فيتنس. جميع الحقوق محفوظة.",
      lang: "English",
    },
  },
};

// ─────────────────────────────────────────────
// BEFORE / AFTER SLIDER COMPONENT
// ─────────────────────────────────────────────
function BeforeAfterSlider({ beforeSrc, afterSrc, beforeLabel = "Before", afterLabel = "After" }) {
  const [pos, setPos] = useState(50);
  const dragging = useRef(false);
  const containerRef = useRef(null);

  const getPercent = useCallback((clientX) => {
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return (x / rect.width) * 100;
  }, []);

  const onMove = useCallback((e) => {
    if (!dragging.current) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    setPos(getPercent(clientX));
  }, [getPercent]);

  const onDown = useCallback((e) => {
    dragging.current = true;
    e.preventDefault();
  }, []);

  const onUp = useCallback(() => { dragging.current = false; }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [onMove, onUp]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden select-none cursor-col-resize w-full h-full"
      onMouseDown={onDown}
      onTouchStart={onDown}
    >
      <img src={afterSrc} alt={afterLabel} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <img src={beforeSrc} alt={beforeLabel} className="absolute inset-0 w-full h-full object-cover" style={{ width: `${10000 / pos}%` }} draggable={false} />
      </div>
      {/* Divider */}
      <div className="absolute top-0 bottom-0 w-px bg-white/90" style={{ left: `${pos}%` }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M5 8H1M11 8h4M5 5L2 8l3 3M11 5l3 3-3 3" stroke="#111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      {/* Labels */}
      <span className="absolute bottom-3 start-3 text-[10px] font-display font-bold tracking-widest uppercase text-white bg-black/50 px-2 py-1">{beforeLabel}</span>
      <span className="absolute bottom-3 end-3 text-[10px] font-display font-bold tracking-widest uppercase text-white bg-black/50 px-2 py-1">{afterLabel}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// ACCORDION ITEM
// ─────────────────────────────────────────────
function AccordionItem({ q, a, open, onToggle }) {
  const bodyRef = useRef(null);
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    if (open) {
      el.style.maxHeight = el.scrollHeight + "px";
      el.style.opacity = "1";
    } else {
      el.style.maxHeight = "0px";
      el.style.opacity = "0";
    }
  }, [open]);

  return (
    <div className="border-b border-stone-200">
      <button
        className="w-full flex items-center justify-between py-5 text-start gap-4 group"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="font-body text-base font-semibold text-stone-900 group-hover:text-orange-600 transition-colors duration-200">{q}</span>
        <span className={`text-stone-400 transition-transform duration-300 flex-shrink-0 ${open ? "rotate-45" : ""}`}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </span>
      </button>
      <div ref={bodyRef} className="overflow-hidden transition-all duration-300 ease-in-out" style={{ maxHeight: 0, opacity: 0 }}>
        <p className="font-body text-stone-500 text-sm pb-5 md: leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// COUNT UP HOOK
// ─────────────────────────────────────────────
function useCountUp(target, started) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!started) return;
    let start = 0;
    const duration = 1800;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, started]);
  return count;
}

// ─────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────
export default function Page() {
  const locale = useLocale();
  const t = content[locale] || content.en;
  const isAr = locale === "ar";

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [statsVisible, setStatsVisible] = useState(false);

  const heroRef = useRef(null);
  const heroHeadRef = useRef(null);
  const heroSubRef = useRef(null);
  const heroCTARef = useRef(null);
  const heroImgRef = useRef(null);
  const heroBadgeRef = useRef(null);
  const marqueeRef = useRef(null);
  const statsRef = useRef(null);
  const featuredRef = useRef(null);
  const gsapCtxRef = useRef(null);

  // Scroll listener for nav
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Stats visibility (IntersectionObserver fallback since GSAP handles the rest)
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStatsVisible(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // GSAP
  useEffect(() => {
    let gsap, ScrollTrigger;
    const init = async () => {
      try {
        const g = await import("gsap");
        const st = await import("gsap/ScrollTrigger");
        gsap = g.gsap || g.default;
        ScrollTrigger = st.ScrollTrigger;
        gsap.registerPlugin(ScrollTrigger);
        gsapCtxRef.current = gsap.context(() => {

          // HERO ENTRANCE
          const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
          if (heroHeadRef.current) {
            const lines = heroHeadRef.current.querySelectorAll(".headline-line");
            tl.from(lines, { y: 60,  duration: 0.9, stagger: 0.12 }, 0)
              .from(heroSubRef.current, { y: 24,  duration: 0.7 }, 0.55)
              .from(heroCTARef.current, { y: 20,  duration: 0.6 }, 0.7)
              .from(heroImgRef.current, { scale: 1.06,  duration: 1.1 }, 0.2)
              .from(heroBadgeRef.current?.children || [], { y: 14,  stagger: 0.15, duration: 0.6 }, 0.85);
          }

          // Parallax on hero image
          if (heroImgRef.current) {
            gsap.to(heroImgRef.current, {
              yPercent: -12,
              ease: "none",
              scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: true },
            });
          }

          // Marquee
          if (marqueeRef.current) {
            const inner = marqueeRef.current.querySelector(".marquee-inner");
            if (inner) {
              gsap.to(inner, {
                xPercent: isAr ? 50 : -50,
                ease: "none",
                duration: 22,
                repeat: -1,
              });
            }
          }

          // Staggered section reveals
          const revealSections = document.querySelectorAll(".gsap-reveal");
          revealSections.forEach((el) => {
            gsap.from(el, {
              y: 40,
              
              duration: 0.85,
              ease: "power2.out",
              scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none none" },
            });
          });

          // Transformation card reveals
          const cards = document.querySelectorAll(".transform-card");
          cards.forEach((card, i) => {
            gsap.from(card, {
              y: 50,
              
              duration: 0.8,
              delay: (i % 2) * 0.15,
              ease: "power2.out",
              scrollTrigger: { trigger: card, start: "top 90%", toggleActions: "play none none none" },
            });
          });

          // Featured parallax
          if (featuredRef.current) {
            const imgs = featuredRef.current.querySelectorAll(".parallax-img");
            imgs.forEach((img) => {
              gsap.to(img, {
                yPercent: -8,
                ease: "none",
                scrollTrigger: { trigger: featuredRef.current, start: "top bottom", end: "bottom top", scrub: true },
              });
            });
          }

        }, heroRef);
      } catch (err) {
        console.warn("GSAP not available:", err);
      }
    };
    init();
    return () => { if (gsapCtxRef.current) gsapCtxRef.current.revert(); };
  }, [isAr]);

  // Stat count components (using IntersectionObserver trigger)
  const StatNum = ({ num, suffix }) => {
    const val = useCountUp(num, statsVisible);
    return <span>{val}{suffix}</span>;
  };

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  const sectionIds = ["about", "method", "programs", "results", "pricing"];

  return (
    <div className="bg-stone-50 text-stone-900 font-body overflow-x-hidden">

      {/* ── NAV ── */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/90 backdrop-blur-md border-b border-stone-200/80 py-3" : "bg-transparent py-5"}`}>
        <nav className="max-w-7xl mx-auto px-5 md:px-8 flex items-center justify-between">
          <button onClick={() => scrollToSection("hero")} className="flex items-center gap-2 group">
            <span className="w-7 h-7 bg-orange-600 flex items-center justify-center">
              <span className="text-white text-[10px] font-display font-black">K</span>
            </span>
            <span className="font-display font-black text-lg tracking-tight text-stone-900">{t.nav.logo}</span>
            <span className="text-[9px] font-display font-bold tracking-[0.2em] uppercase text-stone-400 border-s border-stone-300 ps-2">{t.nav.tagline}</span>
          </button>

          <div className="hidden md:flex items-center gap-8">
            {t.nav.links.map((link, i) => (
              <button key={i} onClick={() => scrollToSection(sectionIds[i])} className="text-xs font-display font-semibold tracking-widest uppercase text-stone-500 hover:text-orange-600 transition-colors duration-200">
                {link}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <a href={`/${isAr ? "en" : "ar"}`} className="hidden md:block text-xs font-display font-semibold tracking-widest uppercase text-stone-400 hover:text-stone-700 transition-colors">
              {t.nav.lang}
            </a>
            <button onClick={() => scrollToSection("pricing")} className="hidden md:flex items-center h-9 px-5 bg-orange-600 text-white text-xs font-display font-bold tracking-widest uppercase hover:bg-orange-700 transition-colors duration-200">
              {t.nav.cta}
            </button>
            <button className="md:hidden p-1" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                {menuOpen
                  ? <><path d="M4 4l14 14M18 4L4 18" stroke="#111" strokeWidth="1.6" strokeLinecap="round"/></>
                  : <><path d="M3 6h16M3 11h16M3 16h16" stroke="#111" strokeWidth="1.6" strokeLinecap="round"/></>
                }
              </svg>
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        <div className={`md:hidden transition-all duration-300 overflow-hidden ${menuOpen ? "max-h-96 border-t border-stone-200" : "max-h-0"}`}>
          <div className="bg-white px-5 py-4 flex flex-col gap-4">
            {t.nav.links.map((link, i) => (
              <button key={i} onClick={() => scrollToSection(sectionIds[i])} className="text-sm font-display font-semibold tracking-widest uppercase text-stone-600 text-start">
                {link}
              </button>
            ))}
            <div className="flex items-center gap-3 pt-2 border-t border-stone-100">
              <button onClick={() => scrollToSection("pricing")} className="flex-1 h-10 bg-orange-600 text-white text-xs font-display font-bold tracking-widest uppercase">
                {t.nav.cta}
              </button>
              <a href={`/${isAr ? "en" : "ar"}`} className="text-xs font-display font-bold tracking-widest uppercase text-stone-400">
                {t.nav.lang}
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section id="hero" ref={heroRef} className="relative min-h-screen bg-stone-100 overflow-hidden flex items-end md:items-stretch">
        {/* Background accent */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 end-0 w-1/2 h-full bg-stone-200/60" />
          <div className="absolute bottom-0 start-0 w-32 h-px bg-orange-600" />
        </div>

        <div className="relative max-w-7xl mx-auto px-5 md:px-8 w-full grid md:grid-cols-2 gap-0 pt-28 md:pt-0">
          {/* Text */}
          <div className="flex flex-col justify-center pb-16 md:py-32 z-10">
            <div ref={heroHeadRef}>
              <p className="headline-line text-[10px] font-display font-bold tracking-[0.3em] uppercase text-orange-600 mb-6">{t.hero.eyebrow}</p>
              <h1 className="font-display font-black md: leading-[0.92] tracking-tight">
                <span className="headline-line block text-5xl md:text-7xl lg:text-8xl text-stone-900">{t.hero.headline1}</span>
                <span className="headline-line block text-5xl md:text-7xl lg:text-8xl text-stone-900">{t.hero.headline2}</span>
                <span className="headline-line block text-5xl md:text-7xl lg:text-8xl text-orange-600">{t.hero.headline3}</span>
              </h1>
            </div>
            <p ref={heroSubRef} className="mt-6 md:mt-8 text-stone-500 text-base md:text-lg md: leading-relaxed max-w-md font-body">
              {t.hero.sub}
            </p>
            <div ref={heroCTARef} className="flex flex-wrap items-center gap-3 mt-8">
              <button onClick={() => scrollToSection("pricing")} className="h-12 px-7 bg-orange-600 text-white text-xs font-display font-bold tracking-widest uppercase hover:bg-orange-700 transition-colors duration-200">
                {t.hero.cta1}
              </button>
              <button onClick={() => scrollToSection("results")} className="h-12 px-7 border border-stone-300 text-stone-700 text-xs font-display font-bold tracking-widest uppercase hover:border-stone-500 transition-colors duration-200 flex items-center gap-2">
                {t.hero.cta2}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="rtl:-scale-x-100"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>

          {/* Image */}
          <div className="relative md:flex items-end justify-center overflow-hidden mt-8 md:mt-0">
            <div ref={heroImgRef} className="relative w-full md:h-full flex items-end">
              <div className="w-full aspect-[3/4] md:aspect-auto md:h-[90vh] max-h-[700px] overflow-hidden">
                <img src={images.hero} alt={t.hero.imageAlt} className="w-full h-full object-cover object-top" />
              </div>
              {/* Orange accent bar */}
              <div className="absolute bottom-0 start-0 w-1 h-32 bg-orange-600" />
            </div>

            {/* Floating badges */}
            <div ref={heroBadgeRef} className="absolute top-1/4 end-4 md:end-6 flex flex-col gap-3">
              <div className="bg-white shadow-sm border border-stone-200/80 px-4 py-3 min-w-[130px]">
                <p className="text-[9px] font-display font-bold tracking-widest uppercase text-orange-600 mb-1">Verified</p>
                <p className="text-xs font-display font-black text-stone-900">{t.hero.badge1}</p>
              </div>
              <div className="bg-stone-900 px-4 py-3 min-w-[130px]">
                <p className="text-[9px] font-display font-bold tracking-widest uppercase text-orange-400 mb-1">Certified</p>
                <p className="text-xs font-display font-black text-white">{t.hero.badge2}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <section className="bg-stone-900">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="grid grid-cols-3 md:grid-cols-5 divide-x divide-stone-700/60 rtl:divide-x-reverse">
            {t.trust.map((item, i) => (
              <div key={i} className="py-5 px-4 md:px-6 text-center">
                <p className="font-display font-black text-xl md:text-2xl text-white">{item.value}</p>
                <p className="text-[9px] font-display font-semibold tracking-widest uppercase text-stone-400 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <section ref={marqueeRef} className="bg-white border-y border-stone-200 py-4 overflow-hidden gsap-reveal">
        <div className="marquee-inner flex gap-12 whitespace-nowrap" style={{ width: "200%" }}>
          {[...t.marquee, ...t.marquee, ...t.marquee, ...t.marquee].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-4 text-[10px] font-display font-bold tracking-[0.25em] uppercase text-stone-400 flex-shrink-0">
              <span className="w-1.5 h-1.5 bg-orange-600 rounded-full flex-shrink-0" />
              {item}
            </span>
          ))}
        </div>
      </section>

      {/* ── STATS ── */}
      <section ref={statsRef} id="results" className="py-20 md:py-28 bg-stone-50">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-stone-200/80 rtl:divide-x-reverse border border-stone-200/80">
            {t.stats.map((s, i) => (
              <div key={i} className={`py-10 md:py-14 px-6 md:px-10 ${i % 2 === 0 ? "" : ""}`}>
                <p className="font-display font-black text-4xl md:text-6xl lg:text-7xl text-stone-900 md: leading-none">
                  <StatNum num={s.num} suffix={s.suffix} />
                </p>
                <p className="text-[10px] font-display font-bold tracking-[0.25em] uppercase text-stone-400 mt-3">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            <div className="relative gsap-reveal order-2 md:order-1">
              <div className="aspect-[4/5] overflow-hidden">
                <img src={images.about} alt={t.about.imageAlt} className="w-full h-full object-cover" />
              </div>
              <div className="absolute bottom-6 end-0 translate-x-2 md:translate-x-6 bg-stone-900 p-5 max-w-[200px]">
                <p className="text-[8px] font-display font-bold tracking-[0.25em] uppercase text-orange-400 mb-2">Philosophy</p>
                <p className="text-white font-display font-black text-sm md: leading-tight">"{t.about.quote}"</p>
              </div>
            </div>
            <div className="gsap-reveal order-1 md:order-2">
              <p className="text-[10px] font-display font-bold tracking-[0.3em] uppercase text-orange-600 mb-5">{t.about.eyebrow}</p>
              <h2 className="font-display font-black text-3xl md:text-5xl text-stone-900 md: leading-tight mb-6">{t.about.headline}</h2>
              <p className="text-stone-500 md: leading-relaxed mb-4">{t.about.body1}</p>
              <p className="text-stone-500 md: leading-relaxed mb-8">{t.about.body2}</p>
              <div className="flex flex-wrap gap-2">
                {t.about.certs.map((cert, i) => (
                  <span key={i} className="text-[9px] font-display font-bold tracking-widest uppercase border border-stone-300 px-3 py-1.5 text-stone-600">
                    {cert}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY ── */}
      <section className="py-20 md:py-28 bg-stone-100">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="max-w-xl mb-14 gsap-reveal">
            <p className="text-[10px] font-display font-bold tracking-[0.3em] uppercase text-orange-600 mb-4">{t.why.eyebrow}</p>
            <h2 className="font-display font-black text-3xl md:text-5xl text-stone-900 md: leading-tight">{t.why.headline}</h2>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-0 border border-stone-200/80 divide-x divide-y divide-stone-200/80 rtl:divide-x-reverse">
            {t.why.items.map((item, i) => (
              <div key={i} className="p-7 md:p-9 bg-white gsap-reveal hover:bg-stone-50 transition-colors">
                <span className="block text-[9px] font-display font-bold tracking-widest uppercase text-stone-300 mb-4">0{i + 1}</span>
                <h3 className="font-display font-black text-base text-stone-900 mb-2">{item.title}</h3>
                <p className="text-sm text-stone-500 md: leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO THIS IS FOR ── */}
      <section className="py-20 md:py-28 bg-stone-900">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="max-w-xl mb-14 gsap-reveal">
            <p className="text-[10px] font-display font-bold tracking-[0.3em] uppercase text-orange-500 mb-4">{t.forWho.eyebrow}</p>
            <h2 className="font-display font-black text-3xl md:text-5xl text-white md: leading-tight">{t.forWho.headline}</h2>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-px bg-stone-700/40">
            {t.forWho.items.map((item, i) => (
              <div key={i} className="bg-stone-900 p-7 md:p-9 gsap-reveal hover:bg-stone-800 transition-colors duration-200">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-1 h-5 bg-orange-600 flex-shrink-0 mt-0.5" />
                  <h3 className="font-display font-black text-base text-white">{item.label}</h3>
                </div>
                <p className="text-sm text-stone-400 md: leading-relaxed ps-4">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── METHOD ── */}
      <section id="method" className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="max-w-xl mb-14 gsap-reveal">
            <p className="text-[10px] font-display font-bold tracking-[0.3em] uppercase text-orange-600 mb-4">{t.method.eyebrow}</p>
            <h2 className="font-display font-black text-3xl md:text-5xl text-stone-900 md: leading-tight">{t.method.headline}</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-0 border-s border-t border-stone-200 rtl:border-s-0 rtl:border-e">
            {t.method.steps.map((step, i) => (
              <div key={i} className="border-e border-b border-stone-200 p-7 md:p-9 gsap-reveal rtl:border-e-0 rtl:border-s">
                <p className="font-display font-black text-4xl text-stone-100 mb-4 md: leading-none">{step.num}</p>
                <h3 className="font-display font-bold text-base text-stone-900 mb-2">{step.title}</h3>
                <p className="text-sm text-stone-500 md: leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="programs" className="py-20 md:py-28 bg-stone-100">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="max-w-xl mb-14 gsap-reveal">
            <p className="text-[10px] font-display font-bold tracking-[0.3em] uppercase text-orange-600 mb-4">{t.services.eyebrow}</p>
            <h2 className="font-display font-black text-3xl md:text-5xl text-stone-900 md: leading-tight">{t.services.headline}</h2>
          </div>

          {/* Bento layout */}
          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            {/* Service 01 — full height */}
            <div className="md:row-span-2 gsap-reveal bg-stone-900 overflow-hidden flex flex-col">
              <div className="aspect-video md:aspect-auto md:flex-1 overflow-hidden">
                <img src={images.service1} alt={t.services.items[0].imageAlt} className="w-full h-full object-cover opacity-80" />
              </div>
              <div className="p-7 md:p-8">
                <p className="text-[9px] font-display font-bold tracking-widest uppercase text-orange-500 mb-3">{t.services.items[0].num} — {t.services.items[0].sub}</p>
                <h3 className="font-display font-black text-2xl text-white mb-3">{t.services.items[0].title}</h3>
                <p className="text-sm text-stone-400 md: leading-relaxed mb-5">{t.services.items[0].desc}</p>
                <button onClick={() => scrollToSection("pricing")} className="text-[10px] font-display font-bold tracking-widest uppercase text-orange-500 flex items-center gap-2 hover:gap-3 transition-all">
                  {t.services.items[0].cta} <span className="rtl:-scale-x-100">→</span>
                </button>
              </div>
            </div>

            {/* Service 02 */}
            <div className="gsap-reveal bg-white border border-stone-200 overflow-hidden flex flex-col">
              <div className="aspect-video overflow-hidden">
                <img src={images.service2} alt={t.services.items[1].imageAlt} className="w-full h-full object-cover" />
              </div>
              <div className="p-7">
                <p className="text-[9px] font-display font-bold tracking-widest uppercase text-orange-600 mb-2">{t.services.items[1].num} — {t.services.items[1].sub}</p>
                <h3 className="font-display font-black text-xl text-stone-900 mb-2">{t.services.items[1].title}</h3>
                <p className="text-sm text-stone-500 md: leading-relaxed mb-4">{t.services.items[1].desc}</p>
                <button onClick={() => scrollToSection("pricing")} className="text-[10px] font-display font-bold tracking-widest uppercase text-orange-600 flex items-center gap-2">
                  {t.services.items[1].cta} <span className="rtl:-scale-x-100">→</span>
                </button>
              </div>
            </div>

            {/* Service 03 */}
            <div className="gsap-reveal bg-orange-600 overflow-hidden flex flex-col">
              <div className="aspect-video overflow-hidden">
                <img src={images.service3} alt={t.services.items[2].imageAlt} className="w-full h-full object-cover mix-blend-multiply opacity-60" />
              </div>
              <div className="p-7">
                <p className="text-[9px] font-display font-bold tracking-widest uppercase text-white/70 mb-2">{t.services.items[2].num} — {t.services.items[2].sub}</p>
                <h3 className="font-display font-black text-xl text-white mb-2">{t.services.items[2].title}</h3>
                <p className="text-sm text-white/80 md: leading-relaxed mb-4">{t.services.items[2].desc}</p>
                <button onClick={() => scrollToSection("pricing")} className="text-[10px] font-display font-bold tracking-widest uppercase text-white flex items-center gap-2">
                  {t.services.items[2].cta} <span className="rtl:-scale-x-100">→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURED TRANSFORMATION ── */}
      <section ref={featuredRef} className="py-20 md:py-28 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="max-w-xl mb-10 gsap-reveal">
            <p className="text-[10px] font-display font-bold tracking-[0.3em] uppercase text-orange-600 mb-4">{t.featured.eyebrow}</p>
            <h2 className="font-display font-black text-3xl md:text-5xl text-stone-900 md: leading-tight">{t.featured.headline}</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
            {/* Slider */}
            <div className="gsap-reveal aspect-[3/4] overflow-hidden parallax-img">
              <BeforeAfterSlider
                beforeSrc={images.featuredBefore}
                afterSrc={images.featuredAfter}
                beforeLabel={t.featured.beforeLabel}
                afterLabel={t.featured.afterLabel}
              />
            </div>
            {/* Story */}
            <div className="flex flex-col justify-center gsap-reveal">
              <p className="text-sm text-stone-500 md: leading-relaxed mb-8 max-w-md">{t.featured.story}</p>
              <div className="grid grid-cols-2 gap-0 border border-stone-200 mb-8">
                {t.featured.stats.map((s, i) => (
                  <div key={i} className={`p-5 ${i % 2 === 0 ? "border-e border-stone-200 rtl:border-e-0 rtl:border-s" : ""} ${i < 2 ? "border-b border-stone-200" : ""}`}>
                    <p className="font-display font-black text-2xl text-stone-900">{s.val}</p>
                    <p className="text-[9px] font-display font-bold tracking-widest uppercase text-stone-400 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs font-display font-bold tracking-widest uppercase text-stone-400">{t.featured.clientName}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRANSFORMATION GALLERY ── */}
      <section className="py-20 md:py-28 bg-stone-100">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="max-w-xl mb-14 gsap-reveal">
            <p className="text-[10px] font-display font-bold tracking-[0.3em] uppercase text-orange-600 mb-4">{t.transformations.eyebrow}</p>
            <h2 className="font-display font-black text-3xl md:text-5xl text-stone-900 md: leading-tight">{t.transformations.headline}</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {t.transformations.items.map((item, i) => {
              const beforeImgs = [images.t1Before, images.t2Before, images.t3Before, images.t4Before];
              const afterImgs = [images.t1After, images.t2After, images.t3After, images.t4After];
              return (
                <div key={i} className={`transform-card bg-white overflow-hidden ${i === 1 ? "md:mt-8" : i === 3 ? "md:mt-4" : ""}`}>
                  <div className="aspect-[3/4] overflow-hidden">
                    <BeforeAfterSlider
                      beforeSrc={beforeImgs[i]}
                      afterSrc={afterImgs[i]}
                      beforeLabel={t.transformations.beforeLabel}
                      afterLabel={t.transformations.afterLabel}
                    />
                  </div>
                  <div className="p-4 border-t border-stone-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-display font-black text-sm text-stone-900">{item.name}</p>
                      <span className="text-[9px] font-display font-bold tracking-widest uppercase text-stone-400">{item.duration}</span>
                    </div>
                    <p className="text-[9px] font-display font-bold tracking-widest uppercase text-orange-600 mb-3">{item.goal}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {item.stats.map((s, j) => (
                        <span key={j} className="text-[9px] font-display font-bold bg-stone-100 text-stone-600 px-2 py-1">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="max-w-xl mb-14 gsap-reveal">
            <p className="text-[10px] font-display font-bold tracking-[0.3em] uppercase text-orange-600 mb-4">{t.testimonials.eyebrow}</p>
            <h2 className="font-display font-black text-3xl md:text-5xl text-stone-900 md: leading-tight">{t.testimonials.headline}</h2>
          </div>
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {t.testimonials.items.map((item, i) => (
              <div key={i} className={`break-inside-avoid gsap-reveal bg-stone-50 border border-stone-200/80 p-6 ${i === 1 || i === 4 ? "lg:mt-6" : ""}`}>
                <p className="text-stone-600 text-sm md: leading-relaxed mb-5 font-body">"{item.quote}"</p>
                <div className="flex items-center gap-3">
                  <img src={item.img} alt={item.name} className="w-9 h-9 object-cover rounded-full grayscale" />
                  <div>
                    <p className="font-display font-black text-xs text-stone-900">{item.name}</p>
                    <p className="text-[9px] font-display font-bold tracking-widest uppercase text-stone-400">{item.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RESOURCES ── */}
      <section className="py-20 md:py-28 bg-stone-100">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="max-w-xl mb-14 gsap-reveal">
            <p className="text-[10px] font-display font-bold tracking-[0.3em] uppercase text-orange-600 mb-4">{t.resources.eyebrow}</p>
            <h2 className="font-display font-black text-3xl md:text-5xl text-stone-900 md: leading-tight">{t.resources.headline}</h2>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {t.resources.items.map((item, i) => (
              <div key={i} className="gsap-reveal bg-white border border-stone-200 p-7 group hover:border-orange-300 transition-colors duration-200">
                <div className="w-8 h-px bg-orange-600 mb-5 group-hover:w-12 transition-all duration-300" />
                <h3 className="font-display font-bold text-sm text-stone-900 mb-2">{item.title}</h3>
                <p className="text-sm text-stone-500 md: leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="max-w-xl mb-14 gsap-reveal">
            <p className="text-[10px] font-display font-bold tracking-[0.3em] uppercase text-orange-600 mb-4">{t.pricing.eyebrow}</p>
            <h2 className="font-display font-black text-3xl md:text-5xl text-stone-900 md: leading-tight">{t.pricing.headline}</h2>
            <p className="text-stone-400 text-sm mt-3">{t.pricing.note}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 md:gap-6 items-stretch">
            {t.pricing.tiers.map((tier, i) => (
              <div
                key={i}
                className={`gsap-reveal flex flex-col ${
                  tier.highlight
                    ? "bg-stone-900 text-white -mt-0 md:-mt-4 md:mb-4"
                    : "bg-stone-50 border border-stone-200"
                }`}
              >
                <div className="p-8 flex-1">
                  {tier.badge && (
                    <span className="inline-block text-[9px] font-display font-bold tracking-widest uppercase bg-orange-600 text-white px-3 py-1.5 mb-5">
                      {tier.badge}
                    </span>
                  )}
                  <p className={`text-[10px] font-display font-bold tracking-[0.25em] uppercase mb-3 ${tier.highlight ? "text-stone-400" : "text-stone-400"}`}>
                    {tier.name}
                  </p>
                  <div className="flex items-end gap-1 mb-6">
                    <span className={`font-display font-black text-5xl ${tier.highlight ? "text-white" : "text-stone-900"}`}>{tier.price}</span>
                    <span className={`text-sm mb-2 ${tier.highlight ? "text-stone-400" : "text-stone-400"}`}>{tier.period}</span>
                  </div>
                  <div className={`h-px mb-6 ${tier.highlight ? "bg-stone-700" : "bg-stone-200"}`} />
                  <ul className="space-y-3">
                    {tier.features.map((f, j) => (
                      <li key={j} className={`flex items-start gap-3 text-sm ${tier.highlight ? "text-stone-300" : "text-stone-600"}`}>
                        <svg className="flex-shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M2 7l3.5 3.5L12 3" stroke={tier.highlight ? "#ea580c" : "#ea580c"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-8 pt-0">
                  <button
                    onClick={() => scrollToSection("cta")}
                    className={`w-full h-12 text-xs font-display font-bold tracking-widest uppercase transition-colors duration-200 ${
                      tier.highlight
                        ? "bg-orange-600 text-white hover:bg-orange-700"
                        : "border border-stone-300 text-stone-700 hover:border-stone-600"
                    }`}
                  >
                    {tier.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 md:py-28 bg-stone-100">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <div className="max-w-xl mb-12 gsap-reveal">
            <p className="text-[10px] font-display font-bold tracking-[0.3em] uppercase text-orange-600 mb-4">{t.faq.eyebrow}</p>
            <h2 className="font-display font-black text-3xl md:text-5xl text-stone-900 md: leading-tight">{t.faq.headline}</h2>
          </div>
          <div className="gsap-reveal">
            {t.faq.items.map((item, i) => (
              <AccordionItem
                key={i}
                q={item.q}
                a={item.a}
                open={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? null : i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section id="cta" className="py-24 md:py-36 bg-stone-900 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute end-0 top-0 w-1/3 h-full bg-orange-600/5" />
          <div className="absolute start-0 bottom-0 w-40 h-px bg-orange-600/40" />
        </div>
        <div className="relative max-w-5xl mx-auto px-5 md:px-8 text-center">
          <p className="text-[10px] font-display font-bold tracking-[0.3em] uppercase text-orange-500 mb-8 gsap-reveal">Let's Work</p>
          <h2 className="font-display font-black text-4xl md:text-7xl lg:text-8xl text-white md: leading-[0.9] tracking-tight mb-8 gsap-reveal">
            {t.cta.headline1}<br />
            <span className="text-orange-500">{t.cta.headline2}</span>
          </h2>
          <p className="text-stone-400 text-base max-w-md mx-auto mb-10 gsap-reveal">{t.cta.sub}</p>
          <button className="gsap-reveal h-14 px-10 bg-orange-600 text-white text-xs font-display font-bold tracking-widest uppercase hover:bg-orange-700 transition-colors duration-200">
            {t.cta.cta}
          </button>
          <p className="text-stone-500 text-xs font-display font-semibold tracking-widest uppercase mt-5 gsap-reveal">{t.cta.trust}</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-stone-950 py-14 md:py-16">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="grid md:grid-cols-4 gap-10 pb-10 border-b border-stone-800">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 bg-orange-600 flex items-center justify-center">
                  <span className="text-white text-[10px] font-display font-black">K</span>
                </span>
                <span className="font-display font-black text-lg tracking-tight text-white">{t.nav.logo}</span>
              </div>
              <p className="text-stone-500 text-sm max-w-xs">{t.footer.tagline}</p>
            </div>
            <div>
              <p className="text-[9px] font-display font-bold tracking-[0.25em] uppercase text-stone-500 mb-4">{t.footer.colLinks}</p>
              <ul className="space-y-2.5">
                {t.footer.links.map((link, i) => (
                  <li key={i}>
                    <button onClick={() => scrollToSection(sectionIds[i] || "hero")} className="text-sm text-stone-400 hover:text-white transition-colors">
                      {link}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[9px] font-display font-bold tracking-[0.25em] uppercase text-stone-500 mb-4">{t.footer.colContact}</p>
              <ul className="space-y-2.5">
                <li><a href={`mailto:${t.footer.email}`} className="text-sm text-stone-400 hover:text-white transition-colors">{t.footer.email}</a></li>
                <li><a href={`tel:${t.footer.phone}`} className="text-sm text-stone-400 hover:text-white transition-colors">{t.footer.phone}</a></li>
              </ul>
              <div className="flex gap-3 mt-5">
                {t.footer.social.map((s, i) => (
                  <a key={i} href="#" className="text-[9px] font-display font-bold tracking-widest uppercase text-stone-500 hover:text-orange-500 transition-colors">
                    {s}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-6 flex-wrap gap-4">
            <p className="text-[11px] text-stone-600">{t.footer.copy}</p>
            <a href={`/${isAr ? "en" : "ar"}`} className="text-[9px] font-display font-bold tracking-widest uppercase text-stone-500 hover:text-stone-300 transition-colors">
              {t.footer.lang}
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}

/*
 * ── CONTENT SHAPE ──────────────────────────────────────────────
 *
 * content.en = {
 *   nav:              { logo, tagline, links[], cta, lang }
 *   hero:             { eyebrow, headline1, headline2, headline3, sub, cta1, cta2, badge1, badge2, imageAlt }
 *   trust:            [ { value, label } × 5 ]
 *   marquee:          [ strings × 9 ]
 *   stats:            [ { num, suffix, label } × 4 ]
 *   about:            { eyebrow, headline, body1, body2, quote, certs[], imageAlt }
 *   why:              { eyebrow, headline, items[ { title, desc } × 6 ] }
 *   forWho:           { eyebrow, headline, items[ { label, desc } × 6 ] }
 *   method:           { eyebrow, headline, steps[ { num, title, desc } × 6 ] }
 *   services:         { eyebrow, headline, items[ { num, title, sub, desc, cta, imageAlt } × 3 ] }
 *   featured:         { eyebrow, headline, story, stats[ { val, label } × 4 ], beforeLabel, afterLabel, clientName }
 *   transformations:  { eyebrow, headline, beforeLabel, afterLabel, items[ { name, duration, goal, stats[] } × 4 ] }
 *   testimonials:     { eyebrow, headline, items[ { name, detail, quote, img } × 6 ] }
 *   resources:        { eyebrow, headline, items[ { title, desc } × 6 ] }
 *   pricing:          { eyebrow, headline, note, tiers[ { name, price, period, highlight, badge?, features[], cta } × 3 ] }
 *   faq:              { eyebrow, headline, items[ { q, a } × 6 ] }
 *   cta:              { headline1, headline2, sub, cta, trust }
 *   footer:           { tagline, colLinks, colContact, links[], email, phone, social[], copy, lang }
 * }
 *
 * content.ar = (same shape, all strings in Arabic)
 *
 * images = {
 *   hero, about, service1, service2, service3,
 *   featuredBefore, featuredAfter,
 *   t1Before, t1After, t2Before, t2After, t3Before, t3After, t4Before, t4After,
 *   testimonial1 .. testimonial6
 * }
 * ─────────────────────────────────────────────────────────────
 */