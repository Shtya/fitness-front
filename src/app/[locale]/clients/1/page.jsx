/*
 * ============================================================
 * COACH LANDING PAGE — page.jsx
 * ============================================================
 *
 * IMAGE KEYS TO REPLACE:
 *   images.coachHero         — Hero section coach portrait
 *   images.coachAbout        — About section coach photo
 *   images.service1          — Online coaching service image
 *   images.service2          — In-person coaching image
 *   images.service3          — Nutrition coaching image
 *   images.featuredBefore    — Featured transformation: before
 *   images.featuredAfter     — Featured transformation: after
 *   images.before1–before4   — Gallery before images
 *   images.after1–after4     — Gallery after images
 *   images.testimonial1–4    — Testimonial profile photos
 *
 * FONT CLASSES USED:
 *   font-display  — Bold display / headline font
 *   font-body     — Clean readable body font
 *   (Define these in tailwind.config.js / global CSS)
 *
 * LOCALIZATION STRATEGY:
 *   - useLocale() from next-intl detects current locale
 *   - All copy lives in const content = { ar: {...}, en: {...} }
 *   - t = content[locale] used throughout JSX
 *   - No external message files, no useTranslations
 *
 * GSAP PLUGINS USED:
 *   - gsap (core)
 *   - ScrollTrigger
 * ============================================================
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useLocale } from "next-intl";

// ============================================================
// IMAGE REGISTRY — replace URLs here, keys used throughout JSX
// ============================================================
const images = {
  coachHero:
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=900&q=85&auto=format&fit=crop",
  coachAbout:
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=85&auto=format&fit=crop",
  service1:
    "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=700&q=80&auto=format&fit=crop",
  service2:
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=700&q=80&auto=format&fit=crop",
  service3:
    "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=700&q=80&auto=format&fit=crop",
  featuredBefore:
    "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80&auto=format&fit=crop",
  featuredAfter:
    "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&q=80&auto=format&fit=crop",
  before1:
    "https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=500&q=80&auto=format&fit=crop",
  after1:
    "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=500&q=80&auto=format&fit=crop",
  before2:
    "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=500&q=80&auto=format&fit=crop",
  after2:
    "https://images.unsplash.com/photo-1598971457999-ca8bd28d9b34?w=500&q=80&auto=format&fit=crop",
  before3:
    "https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=500&q=80&auto=format&fit=crop",
  after3:
    "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=500&q=80&auto=format&fit=crop",
  before4:
    "https://images.unsplash.com/photo-1550345332-09e3ac987658?w=500&q=80&auto=format&fit=crop",
  after4:
    "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500&q=80&auto=format&fit=crop",
  testimonial1:
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80&auto=format&fit=crop&crop=face",
  testimonial2:
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80&auto=format&fit=crop&crop=face",
  testimonial3:
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80&auto=format&fit=crop&crop=face",
  testimonial4:
    "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&q=80&auto=format&fit=crop&crop=face",
};

// ============================================================
// CONTENT — all copy centralized here, edit freely
// ============================================================
const content = {
  en: {
    nav: {
      logo: "APEX",
      logoSub: "by Karim Hassan",
      links: [
        { label: "About", href: "#about" },
        { label: "Method", href: "#method" },
        { label: "Results", href: "#results" },
        { label: "Pricing", href: "#pricing" },
        { label: "FAQ", href: "#faq" },
      ],
      cta: "Start Now",
    },
    hero: {
      eyebrow: "Elite Personal Coaching",
      line1: "Your body is built",
      line2: "in the details.",
      line3Prefix: "No shortcuts.",
      line3Accent: " Real results.",
      sub: "Structured training, precise nutrition, and weekly accountability — designed around your life, not a generic template.",
      cta1: "Book a Free Call",
      cta2: "See Results",
      badge1: "500+ Clients Coached",
      badge2: "7 Years Experience",
      badge3: "NSCA Certified",
    },
    trust: [
      { value: "7+", label: "Years Coaching" },
      { value: "500+", label: "Clients Transformed" },
      { value: "4.9★", label: "Average Rating" },
      { value: "NSCA", label: "Certified Trainer" },
      { value: "12+", label: "Countries Served" },
    ],
    marquee: [
      "NSCA Certified",
      "Science-Based Programming",
      "Personalised Nutrition Plans",
      "Online & In-Person Coaching",
      "Weekly Check-ins",
      "Proven Results",
      "500+ Transformations",
      "Flexible Scheduling",
    ],
    stats: [
      { number: 500, suffix: "+", label: "Clients coached to their goals" },
      { number: 94, suffix: "%", label: "Clients who hit their target in 12 weeks" },
      { number: 7, suffix: " yrs", label: "Building real, lasting physiques" },
      { number: 4.9, suffix: "★", label: "Average client satisfaction score" },
    ],
    about: {
      eyebrow: "The Coach",
      name: "Karim Hassan",
      title: "Certified Strength & Conditioning Specialist",
      body1:
        "I've spent seven years studying why most training programs fail. The answer isn't motivation — it's precision. Cookie-cutter plans ignore the individual. I don't.",
      body2:
        "Every client I work with gets a program built from scratch around their body, their schedule, and their actual goal. Not a template with their name swapped in.",
      quote: "Consistency without structure is just noise.",
      certs: ["NSCA-CSCS", "Precision Nutrition L2", "FMS Certified", "7 Years Industry"],
    },
    why: {
      eyebrow: "Why Work With Me",
      headline: "Better than a gym plan.\nMore effective than guessing.",
      items: [
        {
          title: "Built for you specifically",
          body: "Your program is written after a full assessment of your movement patterns, schedule, and history. Not adapted from a default.",
        },
        {
          title: "Science, not trends",
          body: "Programming based on periodisation, progressive overload, and evidence-backed nutrition — not whatever went viral this month.",
        },
        {
          title: "Nutrition that works with your life",
          body: "No extreme cutting. No elimination diets. Calorie and macro structure designed around your food culture and routine.",
        },
        {
          title: "Accountability that drives progress",
          body: "Weekly check-ins, biweekly video reviews, and plan adjustments based on your actual data — not assumptions.",
        },
        {
          title: "Adjustments when life shifts",
          body: "Travel, stress, injury — your plan adapts. Most online coaches disappear when the plan stops working.",
        },
        {
          title: "A complete picture",
          body: "Sleep quality, recovery protocols, stress load — all factors in your result, all monitored in your program.",
        },
      ],
    },
    forWho: {
      eyebrow: "Who This Is For",
      headline: "Serious about change.\nNot sure where to start.",
      items: [
        { icon: "◈", label: "Complete beginners" },
        { icon: "◈", label: "Fat loss focus" },
        { icon: "◈", label: "Muscle building" },
        { icon: "◈", label: "Body recomposition" },
        { icon: "◈", label: "Busy professionals" },
        { icon: "◈", label: "Online clients anywhere" },
        { icon: "◈", label: "Men and women" },
        { icon: "◈", label: "Those who need real accountability" },
      ],
      cta: "Book a Call",
    },
    method: {
      eyebrow: "The Method",
      headline: "A system. Not a routine.",
      steps: [
        {
          num: "01",
          title: "Deep Assessment",
          body: "We analyse your movement quality, history, lifestyle, and goals before writing a single set.",
        },
        {
          num: "02",
          title: "Custom Program Design",
          body: "A 12-week training block, built entirely from your assessment — with no off-the-shelf templates.",
        },
        {
          num: "03",
          title: "Nutrition Architecture",
          body: "Calorie targets, macro splits, food preference integration, and meal timing protocol aligned to your goal.",
        },
        {
          num: "04",
          title: "Weekly Check-ins",
          body: "Every 7 days: weight data, feedback, training log, body photos reviewed. Nothing goes unnoticed.",
        },
        {
          num: "05",
          title: "Progressive Adjustments",
          body: "The program evolves with you. Plateaus get broken. Progression is planned, not hoped for.",
        },
        {
          num: "06",
          title: "Long-Term Support",
          body: "After results, a transition plan. We build the version of you that stays lean and strong without obsession.",
        },
      ],
    },
    services: {
      eyebrow: "Programs",
      headline: "Choose your path.",
      items: [
        {
          num: "01",
          title: "Online Coaching",
          tag: "Most Popular",
          body: "Full 12-week program with weekly check-ins, custom nutrition, and app-based tracking. For clients anywhere in the world.",
          cta: "Get Started",
          img: images.service1,
        },
        {
          num: "02",
          title: "1-on-1 In-Person",
          tag: "Premium",
          body: "Cairo-based in-person sessions with hands-on form correction, structured programming, and full nutrition support.",
          cta: "Book a Session",
          img: images.service2,
        },
        {
          num: "03",
          title: "Nutrition Coaching",
          tag: "Standalone",
          body: "Precision nutrition without the training program. Calorie targets, food planning, lifestyle integration.",
          cta: "Learn More",
          img: images.service3,
        },
      ],
    },
    featured: {
      eyebrow: "Featured Result",
      name: "Omar, 31 — Dubai",
      goal: "Body Recomposition",
      duration: "14 Weeks",
      story:
        "Omar had trained for 3 years without visible progress. He was eating 'clean' with no structure, lifting without progressive overload, and chronically undersleeping. 14 weeks of structured programming and precise nutrition built the physique he had been chasing.",
      stats: [
        { value: "−14kg", label: "Body Fat" },
        { value: "+6kg", label: "Lean Mass" },
        { value: "14", label: "Weeks" },
        { value: "100%", label: "Online" },
      ],
      beforeLabel: "Before",
      afterLabel: "After",
    },
    gallery: {
      eyebrow: "Client Results",
      headline: "The proof is in the programme.",
      items: [
        {
          name: "Sara, 27",
          goal: "Fat Loss",
          duration: "10 Weeks",
          stats: ["−9kg fat", "+3kg muscle", "Energy up", "Training: 4x/wk"],
          before: images.before1,
          after: images.after1,
        },
        {
          name: "Ahmed, 35",
          goal: "Muscle Gain",
          duration: "16 Weeks",
          stats: ["+8kg mass", "Strength +40%", "No fat gain", "Training: 5x/wk"],
          before: images.before2,
          after: images.after2,
        },
        {
          name: "Lina, 29",
          goal: "Recomp",
          duration: "12 Weeks",
          stats: ["−7kg fat", "+4kg lean", "Posture fixed", "Training: 3x/wk"],
          before: images.before3,
          after: images.after3,
        },
        {
          name: "Hassan, 42",
          goal: "Fat Loss",
          duration: "8 Weeks",
          stats: ["−11kg", "Waist −9cm", "Sleep improved", "Online only"],
          before: images.before4,
          after: images.after4,
        },
      ],
      beforeLabel: "Before",
      afterLabel: "After",
    },
    testimonials: {
      eyebrow: "Social Proof",
      headline: "From clients who were where you are.",
      items: [
        {
          text: "I had two personal trainers before Karim. Neither of them actually adjusted my plan when something wasn't working. He does. That's the difference.",
          name: "Youssef R.",
          detail: "28 — Dubai, Online Client",
          img: images.testimonial1,
        },
        {
          text: "Not a single generic meal plan. He built my nutrition around the food I actually eat, and I lost 10kg without feeling deprived once.",
          name: "Nadia M.",
          detail: "32 — Cairo, Online Client",
          img: images.testimonial2,
        },
        {
          text: "Week 4 I hit a plateau. He saw it coming before I mentioned it, adjusted the programme, and I kept progressing. That's what made me renew.",
          name: "Tarek S.",
          detail: "36 — Riyadh, Online Client",
          img: images.testimonial3,
        },
        {
          text: "I travel constantly for work. Most coaches use that as an excuse. Karim built travel-friendly training blocks and kept the nutrition simple. No excuses.",
          name: "Amira K.",
          detail: "34 — London, Online Client",
          img: images.testimonial4,
        },
      ],
    },
    resources: {
      eyebrow: "Coaching Resources",
      headline: "Tools that come with every programme.",
      items: [
        {
          icon: "⊙",
          title: "Calorie & Macro Calculator",
          body: "Personalised targets based on your TDEE, goal, and food preferences — not an app estimate.",
        },
        {
          icon: "⊙",
          title: "Food Alternatives Guide",
          body: "Swap meals without breaking your targets. Covers Middle Eastern, Mediterranean, and Western diets.",
        },
        {
          icon: "⊙",
          title: "Nutrition Education Library",
          body: "Short, evidence-based breakdowns on fat loss, muscle gain, protein timing, and more.",
        },
        {
          icon: "⊙",
          title: "Weekly Tracking Templates",
          body: "Structured logs for training load, weight, energy, sleep, and food adherence.",
        },
      ],
    },
    pricing: {
      eyebrow: "Investment",
      headline: "Clear pricing. No surprises.",
      note: "All packages include weekly check-ins, custom nutrition, and full messaging support.",
      packages: [
        {
          name: "Starter",
          price: "$149",
          period: "/month",
          tag: null,
          features: [
            "8-week training program",
            "Calorie & macro targets",
            "Weekly check-in (text)",
            "App-based tracking",
            "Email support",
          ],
          cta: "Get Started",
          featured: false,
        },
        {
          name: "Full Coaching",
          price: "$249",
          period: "/month",
          tag: "Most Popular",
          features: [
            "12-week progressive program",
            "Full custom nutrition plan",
            "Weekly video check-ins",
            "Biweekly plan adjustments",
            "Priority messaging support",
            "Food alternatives guide",
          ],
          cta: "Start Full Coaching",
          featured: true,
        },
        {
          name: "Premium 1:1",
          price: "$449",
          period: "/month",
          tag: null,
          features: [
            "Everything in Full Coaching",
            "In-person sessions (Cairo)",
            "Live form review & correction",
            "Daily messaging access",
            "Recovery & sleep protocol",
          ],
          cta: "Book a Call",
          featured: false,
        },
      ],
    },
    faq: {
      eyebrow: "FAQ",
      headline: "Questions most people ask before starting.",
      items: [
        {
          q: "Do I need to be in Cairo to work with you?",
          a: "No. The majority of my clients are online. You get the same custom programme, nutrition plan, and check-in structure regardless of location.",
        },
        {
          q: "How soon will I see results?",
          a: "Most clients see measurable change in the first 3–4 weeks. The pace depends on your starting point, adherence, and sleep quality — all things we monitor together.",
        },
        {
          q: "What if I can only train 3 days per week?",
          a: "Your programme is built around your actual schedule. I regularly coach clients on 3-day splits and they make excellent progress.",
        },
        {
          q: "Do you provide meal plans?",
          a: "I provide calorie and macro targets with food preference integration. I don't write rigid meal-by-meal plans because they rarely stick long-term.",
        },
        {
          q: "What happens after the programme ends?",
          a: "You get a transition plan. We either continue with an advanced phase or I set you up to maintain independently — based on your goals.",
        },
        {
          q: "Is there a commitment period?",
          a: "12 weeks is the recommended minimum for meaningful results. Month-to-month is available after the initial block.",
        },
      ],
    },
    cta: {
      eyebrow: "Ready to Start",
      headline: "Stop guessing.\nStart building.",
      sub: "One free call. No pitch, no pressure. We figure out if this is the right fit for you.",
      btn: "Book Your Free Call",
      trust: "No commitment required • Spots are limited",
    },
    footer: {
      logo: "APEX",
      logoSub: "by Karim Hassan",
      tagline: "Precision coaching for people who are serious about results.",
      groups: [
        {
          title: "Programme",
          links: ["Online Coaching", "In-Person", "Nutrition Only", "Results"],
        },
        {
          title: "Company",
          links: ["About", "Method", "Pricing", "FAQ"],
        },
        {
          title: "Connect",
          links: ["Instagram", "WhatsApp", "Email", "YouTube"],
        },
      ],
      contact: "hello@apexcoach.com",
      copyright: "© 2025 Apex Coaching. All rights reserved.",
    },
  },
  ar: {
    nav: {
      logo: "APEX",
      logoSub: "بواسطة كريم حسن",
      links: [
        { label: "عني", href: "#about" },
        { label: "المنهج", href: "#method" },
        { label: "النتائج", href: "#results" },
        { label: "الأسعار", href: "#pricing" },
        { label: "الأسئلة", href: "#faq" },
      ],
      cta: "ابدأ الآن",
    },
    hero: {
      eyebrow: "تدريب شخصي احترافي",
      line1: "جسمك يُبنى",
      line2: "في التفاصيل.",
      line3Prefix: "لا اختصارات.",
      line3Accent: " نتائج حقيقية.",
      sub: "تدريب منظّم، تغذية دقيقة، ومتابعة أسبوعية — مصمّمة حول حياتك، لا حول قالب جاهز.",
      cta1: "احجز مكالمة مجانية",
      cta2: "شاهد النتائج",
      badge1: "+500 عميل مدرَّب",
      badge2: "7 سنوات خبرة",
      badge3: "معتمد NSCA",
    },
    trust: [
      { value: "+7", label: "سنوات تدريب" },
      { value: "+500", label: "تحوّل مكتمل" },
      { value: "4.9★", label: "متوسط التقييم" },
      { value: "NSCA", label: "مدرب معتمد" },
      { value: "+12", label: "دولة مُخدومة" },
    ],
    marquee: [
      "معتمد NSCA",
      "برمجة مبنية على العلم",
      "خطط تغذية شخصية",
      "تدريب أونلاين وحضوري",
      "متابعة أسبوعية",
      "نتائج مُثبتة",
      "+500 تحوّل",
      "جدول مرن",
    ],
    stats: [
      { number: 500, suffix: "+", label: "عميل وصل إلى هدفه" },
      { number: 94, suffix: "%", label: "من العملاء حققوا هدفهم في 12 أسبوعاً" },
      { number: 7, suffix: " سنة", label: "في بناء أجسام حقيقية ومستدامة" },
      { number: 4.9, suffix: "★", label: "متوسط رضا العملاء" },
    ],
    about: {
      eyebrow: "المدرب",
      name: "كريم حسن",
      title: "أخصائي معتمد في القوة والتكييف البدني",
      body1:
        "أمضيت سبع سنوات أدرس لماذا تفشل معظم برامج التدريب. الإجابة ليست الدافع — بل الدقة. البرامج الجاهزة تتجاهل الفرد. أنا لا أفعل ذلك.",
      body2:
        "كل عميل أعمل معه يحصل على برنامج مبني من الصفر حول جسمه وجدوله وهدفه الحقيقي. ليس قالباً باسمه فقط.",
      quote: "الثبات بلا هيكل مجرد ضجيج.",
      certs: ["NSCA-CSCS", "Precision Nutrition L2", "FMS معتمد", "7 سنوات خبرة"],
    },
    why: {
      eyebrow: "لماذا تعمل معي",
      headline: "أفضل من خطة الجيم.\nأكثر فعالية من التخمين.",
      items: [
        {
          title: "مبني لك تحديداً",
          body: "برنامجك يُكتب بعد تقييم كامل لأنماط حركتك وجدولك وتاريخك. لا مجرد تعديل على نموذج افتراضي.",
        },
        {
          title: "علم لا ترندات",
          body: "برمجة مبنية على التدرج والحمل التدريجي والتغذية المدعومة بالدليل — لا على ما انتشر هذا الشهر.",
        },
        {
          title: "تغذية تتناسب مع حياتك",
          body: "لا حمية قاسية ولا حظر غذائي. هيكل سعرات وماكرو مصمم حول ثقافتك الغذائية وروتينك.",
        },
        {
          title: "محاسبة تدفع التقدم",
          body: "متابعة أسبوعية، مراجعة فيديو نصف شهرية، وتعديلات مبنية على بياناتك الفعلية لا على التخمين.",
        },
        {
          title: "تعديلات عند تغيّر الظروف",
          body: "سفر، ضغط، إصابة — خطتك تتكيّف. معظم المدربين الأونلاين يختفون حين تتوقف الخطة عن العمل.",
        },
        {
          title: "صورة كاملة",
          body: "جودة النوم، بروتوكولات التعافي، الحمل النفسي — كلها عوامل في نتيجتك، وكلها مُراقبة في برنامجك.",
        },
      ],
    },
    forWho: {
      eyebrow: "لمن هذا التدريب",
      headline: "جاد في التغيير.\nلا تعرف من أين تبدأ.",
      items: [
        { icon: "◈", label: "المبتدئون الكاملون" },
        { icon: "◈", label: "هدف حرق الدهون" },
        { icon: "◈", label: "بناء العضلات" },
        { icon: "◈", label: "إعادة تكوين الجسم" },
        { icon: "◈", label: "أصحاب الجداول المزدحمة" },
        { icon: "◈", label: "العملاء الأونلاين في كل مكان" },
        { icon: "◈", label: "رجال ونساء" },
        { icon: "◈", label: "من يحتاج محاسبة حقيقية" },
      ],
      cta: "احجز مكالمة",
    },
    method: {
      eyebrow: "المنهج",
      headline: "منظومة. لا مجرد روتين.",
      steps: [
        {
          num: "01",
          title: "تقييم معمّق",
          body: "نحلّل جودة حركتك وتاريخك وأسلوب حياتك وأهدافك قبل كتابة أي تمرين.",
        },
        {
          num: "02",
          title: "تصميم برنامج مخصص",
          body: "بلوك تدريبي لمدة 12 أسبوعاً مبني بالكامل على تقييمك — بلا قوالب جاهزة.",
        },
        {
          num: "03",
          title: "بنية التغذية",
          body: "أهداف السعرات، توزيع الماكرو، تفضيلاتك الغذائية، وبروتوكول توقيت الوجبات بما يتوافق مع هدفك.",
        },
        {
          num: "04",
          title: "متابعة أسبوعية",
          body: "كل 7 أيام: بيانات الوزن، الملاحظات، سجل التدريب، صور الجسم تُراجع. لا شيء يمرّ دون انتباه.",
        },
        {
          num: "05",
          title: "تعديلات تدريجية",
          body: "البرنامج يتطور معك. الجمود يُكسر. التقدم مخطط له، لا مأمول فيه.",
        },
        {
          num: "06",
          title: "دعم طويل الأمد",
          body: "بعد تحقيق النتائج، خطة انتقال. نبني نسخة منك تبقى نحيفاً وقوياً دون وسواس.",
        },
      ],
    },
    services: {
      eyebrow: "البرامج",
      headline: "اختر مسارك.",
      items: [
        {
          num: "01",
          title: "التدريب الأونلاين",
          tag: "الأكثر طلباً",
          body: "برنامج كامل لمدة 12 أسبوعاً مع متابعة أسبوعية وتغذية مخصصة وتتبع عبر التطبيق. لعملاء في كل مكان.",
          cta: "ابدأ الآن",
          img: images.service1,
        },
        {
          num: "02",
          title: "تدريب حضوري 1:1",
          tag: "بريميوم",
          body: "جلسات حضورية في القاهرة مع تصحيح الأداء ميدانياً وبرمجة منظمة ودعم تغذية كامل.",
          cta: "احجز جلسة",
          img: images.service2,
        },
        {
          num: "03",
          title: "تدريب التغذية فقط",
          tag: "مستقل",
          body: "تغذية دقيقة بدون برنامج تدريبي. أهداف سعرات، تخطيط غذائي، ودمج مع أسلوب الحياة.",
          cta: "اعرف المزيد",
          img: images.service3,
        },
      ],
    },
    featured: {
      eyebrow: "نتيجة مميزة",
      name: "عمر، 31 — دبي",
      goal: "إعادة تكوين الجسم",
      duration: "14 أسبوعاً",
      story:
        "كان عمر يتدرب 3 سنوات دون تقدم مرئي. كان يأكل بشكل 'صحي' بلا هيكل، ويرفع أثقالاً دون حمل تدريجي، وينام بشكل مزمن غير كافٍ. 14 أسبوعاً من البرمجة المنظمة والتغذية الدقيقة بنت الجسم الذي كان يسعى إليه.",
      stats: [
        { value: "−14كغ", label: "دهون" },
        { value: "+6كغ", label: "كتلة عضلية" },
        { value: "14", label: "أسبوع" },
        { value: "100%", label: "أونلاين" },
      ],
      beforeLabel: "قبل",
      afterLabel: "بعد",
    },
    gallery: {
      eyebrow: "نتائج العملاء",
      headline: "الدليل في البرنامج.",
      items: [
        {
          name: "سارة، 27",
          goal: "حرق الدهون",
          duration: "10 أسابيع",
          stats: ["−9كغ دهون", "+3كغ عضلة", "طاقة أعلى", "تدريب: 4 مرات"],
          before: images.before1,
          after: images.after1,
        },
        {
          name: "أحمد، 35",
          goal: "بناء عضلات",
          duration: "16 أسبوعاً",
          stats: ["+8كغ كتلة", "قوة +40%", "بلا زيادة دهون", "تدريب: 5 مرات"],
          before: images.before2,
          after: images.after2,
        },
        {
          name: "لينا، 29",
          goal: "ريكومب",
          duration: "12 أسبوعاً",
          stats: ["−7كغ دهون", "+4كغ نحيف", "وضعية محسّنة", "تدريب: 3 مرات"],
          before: images.before3,
          after: images.after3,
        },
        {
          name: "حسن، 42",
          goal: "حرق الدهون",
          duration: "8 أسابيع",
          stats: ["−11كغ", "خصر −9سم", "نوم أفضل", "أونلاين فقط"],
          before: images.before4,
          after: images.after4,
        },
      ],
      beforeLabel: "قبل",
      afterLabel: "بعد",
    },
    testimonials: {
      eyebrow: "آراء العملاء",
      headline: "من عملاء كانوا في مكانك.",
      items: [
        {
          text: "كان لديّ مدربان شخصيان قبل كريم. لم يعدّل أيّ منهما خطتي حين لم تنجح. هو يفعل ذلك. هذا هو الفرق.",
          name: "يوسف ر.",
          detail: "28 — دبي، عميل أونلاين",
          img: images.testimonial1,
        },
        {
          text: "لا خطة طعام جاهزة واحدة. بنى تغذيتي حول الأكل الذي أحبّه فعلاً، وخسرت 10 كيلوغرامات دون شعور بالحرمان مرة واحدة.",
          name: "ندى م.",
          detail: "32 — القاهرة، عميلة أونلاين",
          img: images.testimonial2,
        },
        {
          text: "في الأسبوع الرابع وصلت إلى ثبات. رآه قبل أن أذكره، عدّل البرنامج، واستمر التقدم. هذا ما جعلني أجدد الاشتراك.",
          name: "طارق س.",
          detail: "36 — الرياض، عميل أونلاين",
          img: images.testimonial3,
        },
        {
          text: "أسافر باستمرار للعمل. معظم المدربين يستخدمون ذلك كعذر. كريم بنى كتلاً تدريبية للسفر وبسّط التغذية. لا أعذار.",
          name: "أميرة ك.",
          detail: "34 — لندن، عميلة أونلاين",
          img: images.testimonial4,
        },
      ],
    },
    resources: {
      eyebrow: "موارد التدريب",
      headline: "أدوات مرفقة مع كل برنامج.",
      items: [
        {
          icon: "⊙",
          title: "حاسبة السعرات والماكرو",
          body: "أهداف مخصصة بناءً على إجمالي طاقتك اليومية وهدفك وتفضيلاتك الغذائية — لا تقدير تطبيقات.",
        },
        {
          icon: "⊙",
          title: "دليل البدائل الغذائية",
          body: "استبدل الوجبات دون كسر أهدافك. يشمل النظام الغذائي الشرقي والمتوسطي والغربي.",
        },
        {
          icon: "⊙",
          title: "مكتبة التثقيف الغذائي",
          body: "شروحات علمية قصيرة عن حرق الدهون وبناء العضل وتوقيت البروتين والمزيد.",
        },
        {
          icon: "⊙",
          title: "قوالب التتبع الأسبوعي",
          body: "سجلات منظمة للحمل التدريبي والوزن والطاقة والنوم والالتزام الغذائي.",
        },
      ],
    },
    pricing: {
      eyebrow: "الأسعار",
      headline: "أسعار واضحة. بلا مفاجآت.",
      note: "جميع الباقات تشمل متابعة أسبوعية وتغذية مخصصة ودعم تواصل كامل.",
      packages: [
        {
          name: "البداية",
          price: "$149",
          period: "/شهر",
          tag: null,
          features: [
            "برنامج تدريبي 8 أسابيع",
            "أهداف سعرات وماكرو",
            "متابعة أسبوعية (نصية)",
            "تتبع عبر التطبيق",
            "دعم بريد إلكتروني",
          ],
          cta: "ابدأ الآن",
          featured: false,
        },
        {
          name: "التدريب الكامل",
          price: "$249",
          period: "/شهر",
          tag: "الأكثر طلباً",
          features: [
            "برنامج تدريجي 12 أسبوعاً",
            "خطة تغذية مخصصة كاملة",
            "متابعة فيديو أسبوعية",
            "تعديلات نصف شهرية",
            "دعم رسائل أولوية",
            "دليل البدائل الغذائية",
          ],
          cta: "ابدأ التدريب الكامل",
          featured: true,
        },
        {
          name: "بريميوم 1:1",
          price: "$449",
          period: "/شهر",
          tag: null,
          features: [
            "كل شيء في التدريب الكامل",
            "جلسات حضورية (القاهرة)",
            "مراجعة وتصحيح حي للأداء",
            "وصول يومي للمراسلة",
            "بروتوكول التعافي والنوم",
          ],
          cta: "احجز مكالمة",
          featured: false,
        },
      ],
    },
    faq: {
      eyebrow: "أسئلة شائعة",
      headline: "أسئلة يطرحها معظم الناس قبل البدء.",
      items: [
        {
          q: "هل يجب أن أكون في القاهرة للعمل معك؟",
          a: "لا. غالبية عملائي أونلاين. تحصل على نفس البرنامج المخصص وخطة التغذية وهيكل المتابعة بغض النظر عن موقعك.",
        },
        {
          q: "متى سأرى نتائج؟",
          a: "يرى معظم العملاء تغييراً قابلاً للقياس في الأسابيع 3-4 الأولى. السرعة تعتمد على نقطة انطلاقك والالتزام وجودة النوم — وكلها أمور نتابعها معاً.",
        },
        {
          q: "ماذا لو استطعت التدريب 3 أيام فقط في الأسبوع؟",
          a: "برنامجك مبني حول جدولك الفعلي. أدرّب عملاء بانتظام على تقسيم 3 أيام ويحققون تقدماً ممتازاً.",
        },
        {
          q: "هل توفر خطط وجبات؟",
          a: "أوفر أهداف سعرات وماكرو مع دمج تفضيلاتك الغذائية. لا أكتب خطط وجبات صارمة وجبة بوجبة لأنها نادراً ما تستمر طويلاً.",
        },
        {
          q: "ماذا يحدث بعد انتهاء البرنامج؟",
          a: "تحصل على خطة انتقال. إما نستمر بمرحلة متقدمة أو أجهّزك للاستمرار باستقلالية — بناءً على أهدافك.",
        },
        {
          q: "هل هناك فترة التزام؟",
          a: "12 أسبوعاً هو الحد الأدنى الموصى به للنتائج الحقيقية. الاشتراك الشهري متاح بعد الكتلة الأولى.",
        },
      ],
    },
    cta: {
      eyebrow: "جاهز للبدء",
      headline: "توقف عن التخمين.\nابدأ البناء.",
      sub: "مكالمة مجانية واحدة. لا عرض مبيعات، لا ضغط. نحدد ما إذا كان هذا مناسباً لك.",
      btn: "احجز مكالمتك المجانية",
      trust: "لا التزام مطلوب • الأماكن محدودة",
    },
    footer: {
      logo: "APEX",
      logoSub: "بواسطة كريم حسن",
      tagline: "تدريب دقيق لمن يأخذ نتائجه بجدية.",
      groups: [
        {
          title: "البرامج",
          links: ["التدريب الأونلاين", "حضوري", "تغذية فقط", "النتائج"],
        },
        {
          title: "الشركة",
          links: ["عني", "المنهج", "الأسعار", "الأسئلة"],
        },
        {
          title: "تواصل",
          links: ["إنستغرام", "واتساب", "البريد الإلكتروني", "يوتيوب"],
        },
      ],
      contact: "hello@apexcoach.com",
      copyright: "© 2025 Apex Coaching. جميع الحقوق محفوظة.",
    },
  },
};

// ============================================================
// BEFORE / AFTER SLIDER COMPONENT
// ============================================================
function BeforeAfterSlider({ before, after, beforeLabel, afterLabel }) {
  const containerRef = useRef(null);
  const [position, setPosition] = useState(50);
  const dragging = useRef(false);

  const getPositionFromEvent = useCallback((e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return (x / rect.width) * 100;
  }, []);

  const onMove = useCallback(
    (e) => {
      if (!dragging.current) return;
      setPosition(getPositionFromEvent(e));
    },
    [getPositionFromEvent]
  );

  const onUp = useCallback(() => {
    dragging.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: true });
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
      className="relative w-full overflow-hidden select-none cursor-col-resize rounded-sm"
      style={{ aspectRatio: "3/4" }}
      onMouseDown={(e) => {
        dragging.current = true;
        setPosition(getPositionFromEvent(e));
      }}
      onTouchStart={(e) => {
        dragging.current = true;
        setPosition(getPositionFromEvent(e));
      }}
    >
      {/* After (base) */}
      <img
        src={after}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      {/* Before (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${position}%` }}
      >
        <img
          src={before}
          alt={beforeLabel}
          className="absolute inset-0 h-full object-cover"
          style={{ width: containerRef.current ? `${containerRef.current.offsetWidth}px` : "100%" }}
          draggable={false}
        />
      </div>
      {/* Divider */}
      <div
        className="absolute top-0 bottom-0 w-px bg-white/90"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 bg-white rounded-full border border-stone-200 shadow-lg flex items-center justify-center">
          <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
            <path d="M1 5H17M1 5L5 1M1 5L5 9M17 5L13 1M17 5L13 9" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      {/* Labels */}
      <span className="absolute bottom-3 start-3 text-xs font-body font-semibold tracking-widest uppercase text-white bg-black/60 px-2 py-1">
        {beforeLabel}
      </span>
      <span className="absolute bottom-3 end-3 text-xs font-body font-semibold tracking-widest uppercase text-white bg-[#ea580c]/90 px-2 py-1">
        {afterLabel}
      </span>
    </div>
  );
}

// ============================================================
// ACCORDION ITEM
// ============================================================
function AccordionItem({ q, a, index }) {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef(null);

  return (
    <div className="border-b border-stone-200">
      <button
        className="w-full flex items-start justify-between gap-6 py-5 text-start"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-xs font-body text-stone-400 font-medium tracking-widest pt-0.5">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="flex-1 text-base font-display font-semibold text-stone-900 leading-snug">
          {q}
        </span>
        <span
          className={`mt-1 flex-shrink-0 w-5 h-5 border border-stone-400 rounded-full flex items-center justify-center transition-transform duration-300 ${open ? "rotate-45" : ""}`}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <line x1="5" y1="0" x2="5" y2="10" stroke="#6b7280" strokeWidth="1.5"/>
            <line x1="0" y1="5" x2="10" y2="5" stroke="#6b7280" strokeWidth="1.5"/>
          </svg>
        </span>
      </button>
      <div
        ref={bodyRef}
        className="overflow-hidden transition-all duration-400 ease-in-out"
        style={{ maxHeight: open ? `${bodyRef.current?.scrollHeight}px` : "0px" }}
      >
        <p className="pb-5 ps-7 font-body text-stone-600 leading-relaxed text-[15px]">{a}</p>
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function CoachLandingPage() {
  const locale = useLocale();
  const t = content[locale] || content.en;

  // Refs for GSAP
  const heroRef = useRef(null);
  const heroHeadRef = useRef(null);
  const heroSubRef = useRef(null);
  const heroCTARef = useRef(null);
  const heroImgRef = useRef(null);
  const heroBadgesRef = useRef(null);
  const statsRef = useRef(null);
  const marqueeRef = useRef(null);

  const [navScrolled, setNavScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Nav scroll
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // GSAP Animations
  useEffect(() => {
    let gsapInstance, ScrollTrigger, ctx;

    const initGSAP = async () => {
      const gsapMod = await import("gsap");
      const stMod = await import("gsap/ScrollTrigger");
      gsapInstance = gsapMod.default || gsapMod.gsap;
      ScrollTrigger = stMod.ScrollTrigger;
      gsapInstance.registerPlugin(ScrollTrigger);

      ctx = gsapInstance.context(() => {
        // Hero entrance
        const tl = gsapInstance.timeline({ delay: 0.2 });

        if (heroImgRef.current) {
          tl.fromTo(
            heroImgRef.current,
            { clipPath: "inset(0 100% 0 0)", scale: 1.08 },
            { clipPath: "inset(0 0% 0 0)", scale: 1, duration: 1.2, ease: "power3.inOut" }
          );
        }

        if (heroHeadRef.current) {
          const lines = heroHeadRef.current.querySelectorAll(".hero-line");
          tl.fromTo(
            lines,
            { y: 60 },
            { y: 0, opacity: 1, stagger: 0.12, duration: 0.9, ease: "power3.out" },
            "-=0.8"
          );
        }

        if (heroSubRef.current) {
          tl.fromTo(
            heroSubRef.current,
            { y: 20 },
            { y: 0, opacity: 1, duration: 0.7, ease: "power2.out" },
            "-=0.4"
          );
        }

        if (heroCTARef.current) {
          tl.fromTo(
            heroCTARef.current,
            { y: 20 },
            { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" },
            "-=0.4"
          );
        }

        if (heroBadgesRef.current) {
          const badges = heroBadgesRef.current.querySelectorAll(".badge");
          tl.fromTo(
            badges,
            { y: 14 },
            { y: 0, opacity: 1, stagger: 0.1, duration: 0.5, ease: "power2.out" },
            "-=0.3"
          );
        }

        // Stats count-up
        if (statsRef.current) {
          const counters = statsRef.current.querySelectorAll(".stat-number");
          counters.forEach((el) => {
            const target = parseFloat(el.dataset.target);
            const isDecimal = !Number.isInteger(target);
            ScrollTrigger.create({
              trigger: el,
              start: "top 85%",
              once: true,
              onEnter: () => {
                gsapInstance.fromTo(
                  { val: 0 },
                  { val: target, duration: 1.6, ease: "power2.out",
                    onUpdate: function () {
                      el.textContent = isDecimal
                        ? this.targets()[0].val.toFixed(1)
                        : Math.round(this.targets()[0].val).toString();
                    },
                  }
                );
              },
            });
          });
        }

        // Section reveals
        gsapInstance.utils
          .toArray(".reveal-section")
          .forEach((section) => {
            gsapInstance.fromTo(
              section,
              { y: 40 },
              {
                y: 0,
                opacity: 1,
                duration: 0.8,
                ease: "power2.out",
                scrollTrigger: {
                  trigger: section,
                  start: "top 88%",
                  once: true,
                },
              }
            );
          });

        // Gallery cards stagger
        gsapInstance.utils
          .toArray(".gallery-card")
          .forEach((card, i) => {
            gsapInstance.fromTo(
              card,
              { y: 50 },
              {
                y: 0,
                opacity: 1,
                duration: 0.7,
                ease: "power2.out",
                delay: (i % 2) * 0.12,
                scrollTrigger: {
                  trigger: card,
                  start: "top 90%",
                  once: true,
                },
              }
            );
          });

        // Marquee
        if (marqueeRef.current) {
          const track = marqueeRef.current.querySelector(".marquee-track");
          if (track) {
            const w = track.offsetWidth / 2;
            gsapInstance.to(track, {
              x: locale === "ar" ? w : -w,
              duration: 30,
              ease: "none",
              repeat: -1,
            });
          }
        }
      });
    };

    initGSAP();
    return () => ctx && ctx.revert();
  }, [locale]);

  return (
    <div className="bg-stone-50 text-stone-900 font-body overflow-x-hidden">
      {/* ====================================================
          01 — STICKY NAV
      ==================================================== */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          navScrolled ? "bg-white/90 backdrop-blur border-b border-stone-200 py-3" : "bg-transparent py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between gap-4">
          {/* Logo */}
          <a href="#" className="flex items-baseline gap-2">
            <span className="font-display font-black text-2xl tracking-tighter text-stone-900">
              {t.nav.logo}
            </span>
            <span className="hidden sm:block text-[11px] font-body text-stone-400 tracking-wide">
              {t.nav.logoSub}
            </span>
          </a>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-7">
            {t.nav.links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-body font-medium text-stone-600 hover:text-stone-900 transition-colors"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Language switcher */}
            <a
              href={locale === "en" ? "/ar" : "/en"}
              className="hidden sm:flex text-xs font-body font-semibold tracking-widest uppercase text-stone-500 hover:text-stone-900 transition-colors px-3 py-1.5 border border-stone-300 hover:border-stone-500"
            >
              {locale === "en" ? "AR" : "EN"}
            </a>
            {/* CTA */}
            <a
              href="#pricing"
              className="hidden sm:flex items-center px-5 py-2.5 bg-[#ea580c] text-white text-sm font-display font-bold tracking-wide hover:bg-[#c2410c] transition-colors"
            >
              {t.nav.cta}
            </a>
            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <span className="block w-5 h-0.5 bg-stone-800 mb-1" />
              <span className="block w-5 h-0.5 bg-stone-800 mb-1" />
              <span className="block w-3 h-0.5 bg-stone-800" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile slide-in menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="bg-white w-72 flex flex-col p-8 gap-6">
            <div className="flex items-center justify-between">
              <span className="font-display font-black text-2xl">{t.nav.logo}</span>
              <button onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M2 2L18 18M18 2L2 18" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <nav className="flex flex-col gap-5">
              {t.nav.links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="text-lg font-display font-semibold text-stone-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {l.label}
                </a>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-3">
              <a
                href="#pricing"
                className="block text-center px-5 py-3 bg-[#ea580c] text-white font-display font-bold"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t.nav.cta}
              </a>
              <a
                href={locale === "en" ? "/ar" : "/en"}
                className="block text-center text-sm font-body text-stone-500 border border-stone-300 py-2"
              >
                {locale === "en" ? "العربية" : "English"}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
          02 — HERO
      ==================================================== */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-end bg-stone-100 overflow-hidden pt-24 pb-16"
        id="hero"
      >
        {/* Background grain */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuNjUiIG51bU9jdGF2ZXM9IjMiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsdGVyPSJ1cmwoI25vaXNlKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==')]" />

        <div className="max-w-7xl mx-auto px-5 sm:px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-0 items-end">
            {/* Text side */}
            <div className="order-2 lg:order-1 pb-0 lg:pb-16 relative z-10">
              {/* Eyebrow */}
              <div className="flex items-center gap-3 mb-6">
                <span className="block w-8 h-px bg-[#ea580c]" />
                <span className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-stone-500">
                  {t.hero.eyebrow}
                </span>
              </div>

              {/* Headline */}
              <div ref={heroHeadRef} className="overflow-hidden">
                <h1 className="font-display font-black leading-[0.92] tracking-tighter">
                  <span className="hero-line block text-[clamp(52px,8vw,96px)] text-stone-900">
                    {t.hero.line1}
                  </span>
                  <span className="hero-line block text-[clamp(52px,8vw,96px)] text-stone-900">
                    {t.hero.line2}
                  </span>
                  <span className="hero-line block text-[clamp(36px,5.5vw,64px)] text-stone-400 mt-1">
                    {t.hero.line3Prefix}
                    <span className="text-[#ea580c]">{t.hero.line3Accent}</span>
                  </span>
                </h1>
              </div>

              {/* Sub */}
              <p
                ref={heroSubRef}
                className="mt-8 max-w-md text-[15px] font-body text-stone-600 leading-relaxed"
              >
                {t.hero.sub}
              </p>

              {/* CTAs */}
              <div
                ref={heroCTARef}
                className="mt-10 flex flex-wrap items-center gap-4"
              >
                <a
                  href="#pricing"
                  className="inline-flex items-center px-8 py-4 bg-stone-900 text-white font-display font-bold text-[13px] tracking-wide uppercase hover:bg-[#ea580c] transition-colors duration-200"
                >
                  {t.hero.cta1}
                </a>
                <a
                  href="#results"
                  className="inline-flex items-center gap-2 text-[13px] font-display font-bold tracking-wide uppercase text-stone-700 hover:text-[#ea580c] transition-colors"
                >
                  <span>{t.hero.cta2}</span>
                  <span className="rtl:-scale-x-100 inline-block">→</span>
                </a>
              </div>
            </div>

            {/* Image side */}
            <div className="order-1 lg:order-2 relative">
              <div
                ref={heroImgRef}
                className="relative ms-auto lg:ms-0 lg:-me-8 overflow-hidden"
                style={{ maxWidth: "580px" }}
              >
                <img
                  src={images.coachHero}
                  alt={t.about.name}
                  className="w-full object-cover"
                  style={{ aspectRatio: "3/4", objectPosition: "top center" }}
                />
                {/* Orange accent strip */}
                <div className="absolute bottom-0 start-0 end-0 h-1 bg-[#ea580c]" />
              </div>

              {/* Floating badges */}
              <div ref={heroBadgesRef}>
                <div className="badge absolute top-12 start-0 bg-white border border-stone-200 px-4 py-3 shadow-sm">
                  <p className="text-xs font-body text-stone-500 tracking-wide">{t.hero.badge1}</p>
                </div>
                <div className="badge absolute bottom-24 start-0 bg-stone-900 text-white px-4 py-3">
                  <p className="text-xs font-body text-stone-300 tracking-wide">{t.hero.badge2}</p>
                </div>
                <div className="badge absolute top-1/3 end-2 lg:end-0 bg-[#ea580c] text-white px-4 py-3">
                  <p className="text-xs font-body font-bold tracking-wide">{t.hero.badge3}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================
          03 — TRUST BAR
      ==================================================== */}
      <section className="border-y border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-stone-100 rtl:divide-x-reverse">
            {t.trust.map((item, i) => (
              <div
                key={i}
                className="py-6 px-4 sm:px-6 flex flex-col gap-1 items-center text-center"
              >
                <span className="font-display font-black text-2xl sm:text-3xl text-stone-900">
                  {item.value}
                </span>
                <span className="text-[11px] font-body text-stone-500 tracking-wide uppercase">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================
          04 — MARQUEE
      ==================================================== */}
      <section
        ref={marqueeRef}
        className="overflow-hidden py-5 bg-stone-900 border-b border-stone-800"
      >
        <div className="marquee-track flex gap-0 whitespace-nowrap">
          {[...t.marquee, ...t.marquee].map((item, i) => (
            <span key={i} className="flex items-center gap-6 px-6">
              <span className="text-[11px] font-body font-semibold tracking-[0.2em] uppercase text-stone-400">
                {item}
              </span>
              <span className="w-1 h-1 rounded-full bg-[#ea580c] flex-shrink-0" />
            </span>
          ))}
        </div>
      </section>

      {/* ====================================================
          05 — STATS
      ==================================================== */}
      <section
        ref={statsRef}
        className="py-24 lg:py-32 bg-stone-50 border-b border-stone-200 reveal-section"
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border border-stone-200">
            {t.stats.map((s, i) => (
              <div
                key={i}
                className={`p-8 sm:p-12 flex flex-col gap-3 ${
                  i < 3 ? "border-e border-stone-200 rtl:border-e-0 rtl:border-s rtl:border-stone-200" : ""
                } ${i >= 2 ? "border-t border-stone-200 lg:border-t-0" : ""}`}
              >
                <div className="font-display font-black text-[clamp(48px,6vw,80px)] leading-none text-stone-900 tracking-tighter">
                  <span
                    className="stat-number"
                    data-target={s.number}
                  >
                    0
                  </span>
                  <span className="text-[#ea580c]">{s.suffix}</span>
                </div>
                <p className="text-[13px] font-body text-stone-500 leading-snug max-w-[160px]">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================
          06 — ABOUT THE COACH
      ==================================================== */}
      <section
        id="about"
        className="py-24 lg:py-32 bg-white border-b border-stone-200 reveal-section"
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Image */}
            <div className="relative">
              <img
                src={images.coachAbout}
                alt={t.about.name}
                className="w-full object-cover"
                style={{ aspectRatio: "4/5", objectPosition: "center top" }}
              />
              <div className="absolute bottom-0 end-0 w-2/3 bg-stone-900 text-white p-6">
                <blockquote className="font-display font-bold text-lg leading-snug">
                  "{t.about.quote}"
                </blockquote>
                <cite className="block mt-3 text-[11px] font-body text-stone-400 tracking-widest uppercase not-italic">
                  — {t.about.name}
                </cite>
              </div>
            </div>

            {/* Text */}
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <span className="block w-6 h-px bg-[#ea580c]" />
                <span className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-stone-500">
                  {t.about.eyebrow}
                </span>
              </div>
              <h2 className="font-display font-black text-[clamp(36px,4.5vw,60px)] leading-tight tracking-tighter text-stone-900 mb-2">
                {t.about.name}
              </h2>
              <p className="text-sm font-body text-stone-500 mb-8 tracking-wide">
                {t.about.title}
              </p>
              <p className="text-[15px] font-body text-stone-700 leading-relaxed mb-5">
                {t.about.body1}
              </p>
              <p className="text-[15px] font-body text-stone-700 leading-relaxed mb-10">
                {t.about.body2}
              </p>
              {/* Cert tags */}
              <div className="flex flex-wrap gap-2">
                {t.about.certs.map((c, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-body font-semibold tracking-[0.15em] uppercase px-3 py-1.5 border border-stone-300 text-stone-600"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================
          07 — WHY CHOOSE THIS COACH
      ==================================================== */}
      <section
        className="py-24 lg:py-32 bg-stone-50 border-b border-stone-200 reveal-section"
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="block w-6 h-px bg-[#ea580c]" />
            <span className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-stone-500">
              {t.why.eyebrow}
            </span>
          </div>
          <h2 className="font-display font-black text-[clamp(32px,4vw,56px)] leading-tight tracking-tighter text-stone-900 mb-16 max-w-xl whitespace-pre-line">
            {t.why.headline}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-0 border border-stone-200">
            {t.why.items.map((item, i) => (
              <div
                key={i}
                className={`p-8 border-stone-200 ${
                  i % 3 !== 2 ? "lg:border-e lg:rtl:border-e-0 lg:rtl:border-s" : ""
                } ${i >= 3 ? "border-t" : ""} ${
                  i % 2 === 0 && i % 3 !== 0 ? "sm:border-e sm:rtl:border-e-0 sm:rtl:border-s" : ""
                } ${i >= 2 && i < 4 ? "sm:border-t" : ""}`}
              >
                <span className="text-xs font-body text-[#ea580c] font-bold tracking-widest mb-3 block">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display font-bold text-lg text-stone-900 mb-3 leading-snug">
                  {item.title}
                </h3>
                <p className="text-[14px] font-body text-stone-600 leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================
          08 — WHO THIS IS FOR
      ==================================================== */}
      <section className="py-24 lg:py-32 bg-stone-900 text-white border-b border-stone-800 reveal-section">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="block w-6 h-px bg-[#ea580c]" />
                <span className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-stone-400">
                  {t.forWho.eyebrow}
                </span>
              </div>
              <h2 className="font-display font-black text-[clamp(32px,4vw,56px)] leading-tight tracking-tighter mb-10 whitespace-pre-line">
                {t.forWho.headline}
              </h2>
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 px-8 py-4 border border-white text-white font-display font-bold text-[13px] tracking-wide uppercase hover:bg-[#ea580c] hover:border-[#ea580c] transition-colors"
              >
                <span>{t.forWho.cta}</span>
                <span className="rtl:-scale-x-100 inline-block">→</span>
              </a>
            </div>
            <div className="grid grid-cols-2 gap-0 border border-stone-700">
              {t.forWho.items.map((item, i) => (
                <div
                  key={i}
                  className={`py-5 px-6 flex items-center gap-3 border-stone-700 ${
                    i % 2 === 0 ? "border-e rtl:border-e-0 rtl:border-s" : ""
                  } ${i >= 2 ? "border-t" : ""}`}
                >
                  <span className="text-[#ea580c] text-sm flex-shrink-0">{item.icon}</span>
                  <span className="text-[14px] font-body text-stone-300">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================
          09 — METHOD
      ==================================================== */}
      <section
        id="method"
        className="py-24 lg:py-32 bg-white border-b border-stone-200 reveal-section"
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="block w-6 h-px bg-[#ea580c]" />
            <span className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-stone-500">
              {t.method.eyebrow}
            </span>
          </div>
          <h2 className="font-display font-black text-[clamp(32px,4vw,56px)] leading-tight tracking-tighter text-stone-900 mb-16">
            {t.method.headline}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-0">
            {t.method.steps.map((step, i) => (
              <div
                key={i}
                className={`relative p-8 border-stone-200 border-t ${
                  i % 3 !== 2 ? "lg:border-e lg:rtl:border-e-0 lg:rtl:border-s" : ""
                } ${i % 2 === 0 ? "sm:border-e sm:rtl:border-e-0 sm:rtl:border-s lg:border-e-0" : ""} ${
                  i % 3 !== 2 ? "lg:border-e" : ""
                } ${i % 2 === 0 && i % 3 !== 2 ? "sm:lg:border-e" : ""}`}
              >
                <span className="font-display font-black text-[64px] leading-none text-stone-100 select-none absolute top-4 end-6">
                  {step.num}
                </span>
                <div className="relative z-10">
                  <span className="text-xs font-body text-[#ea580c] font-bold tracking-widest mb-3 block">
                    {step.num}
                  </span>
                  <h3 className="font-display font-bold text-xl text-stone-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-[14px] font-body text-stone-600 leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================
          10 — SERVICES
      ==================================================== */}
      <section className="py-24 lg:py-32 bg-stone-50 border-b border-stone-200 reveal-section">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="block w-6 h-px bg-[#ea580c]" />
            <span className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-stone-500">
              {t.services.eyebrow}
            </span>
          </div>
          <h2 className="font-display font-black text-[clamp(32px,4vw,56px)] leading-tight tracking-tighter text-stone-900 mb-16">
            {t.services.headline}
          </h2>

          {/* Bento layout */}
          <div className="grid lg:grid-cols-5 gap-4">
            {/* Large card */}
            <div className="lg:col-span-3 bg-white border border-stone-200 overflow-hidden group">
              <div className="overflow-hidden h-64 lg:h-80">
                <img
                  src={t.services.items[0].img}
                  alt={t.services.items[0].title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-body text-stone-400 font-bold tracking-widest">
                    {t.services.items[0].num}
                  </span>
                  {t.services.items[0].tag && (
                    <span className="text-[10px] font-body font-bold tracking-widest uppercase bg-[#ea580c] text-white px-2.5 py-1">
                      {t.services.items[0].tag}
                    </span>
                  )}
                </div>
                <h3 className="font-display font-black text-2xl text-stone-900 mb-3">
                  {t.services.items[0].title}
                </h3>
                <p className="text-[14px] font-body text-stone-600 mb-6 leading-relaxed">
                  {t.services.items[0].body}
                </p>
                <a
                  href="#pricing"
                  className="inline-flex items-center gap-2 text-[13px] font-display font-bold tracking-wide uppercase text-stone-900 border-b border-stone-300 pb-0.5 hover:border-[#ea580c] hover:text-[#ea580c] transition-colors"
                >
                  {t.services.items[0].cta}
                  <span className="rtl:-scale-x-100 inline-block">→</span>
                </a>
              </div>
            </div>

            {/* Two smaller stacked */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {t.services.items.slice(1).map((svc, i) => (
                <div
                  key={i}
                  className="bg-white border border-stone-200 overflow-hidden flex flex-col sm:flex-row lg:flex-col group"
                >
                  <div className="overflow-hidden h-40 sm:w-40 lg:w-auto lg:h-40 flex-shrink-0">
                    <img
                      src={svc.img}
                      alt={svc.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-body text-stone-400 font-bold tracking-widest">
                        {svc.num}
                      </span>
                      {svc.tag && (
                        <span className="text-[10px] font-body font-bold tracking-widest uppercase border border-stone-300 text-stone-500 px-2 py-0.5">
                          {svc.tag}
                        </span>
                      )}
                    </div>
                    <h3 className="font-display font-bold text-lg text-stone-900 mb-2">
                      {svc.title}
                    </h3>
                    <p className="text-[13px] font-body text-stone-600 mb-4 leading-relaxed flex-1">
                      {svc.body}
                    </p>
                    <a
                      href="#pricing"
                      className="inline-flex items-center gap-2 text-[12px] font-display font-bold tracking-wide uppercase text-stone-700 hover:text-[#ea580c] transition-colors"
                    >
                      {svc.cta}
                      <span className="rtl:-scale-x-100 inline-block">→</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================
          11 — FEATURED TRANSFORMATION
      ==================================================== */}
      <section
        id="results"
        className="py-24 lg:py-32 bg-stone-900 text-white border-b border-stone-800 reveal-section"
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="block w-6 h-px bg-[#ea580c]" />
            <span className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-stone-400">
              {t.featured.eyebrow}
            </span>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center mt-10">
            {/* Slider */}
            <div className="w-full max-w-md mx-auto lg:mx-0">
              <BeforeAfterSlider
                before={images.featuredBefore}
                after={images.featuredAfter}
                beforeLabel={t.featured.beforeLabel}
                afterLabel={t.featured.afterLabel}
              />
            </div>

            {/* Story */}
            <div>
              <h2 className="font-display font-black text-[clamp(28px,3.5vw,48px)] leading-tight tracking-tighter mb-2">
                {t.featured.name}
              </h2>
              <div className="flex gap-4 mb-8">
                <span className="text-xs font-body text-stone-400 uppercase tracking-widest">
                  {t.featured.goal}
                </span>
                <span className="text-xs font-body text-stone-600">·</span>
                <span className="text-xs font-body text-stone-400 uppercase tracking-widest">
                  {t.featured.duration}
                </span>
              </div>
              <p className="text-[15px] font-body text-stone-400 leading-relaxed mb-10">
                {t.featured.story}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border border-stone-700">
                {t.featured.stats.map((s, i) => (
                  <div
                    key={i}
                    className={`py-5 px-4 text-center ${i < 3 ? "border-e border-stone-700 rtl:border-e-0 rtl:border-s" : ""}`}
                  >
                    <div className="font-display font-black text-2xl text-[#ea580c] mb-1">
                      {s.value}
                    </div>
                    <div className="text-[10px] font-body text-stone-500 uppercase tracking-widest">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================
          12 — TRANSFORMATION GALLERY
      ==================================================== */}
      <section className="py-24 lg:py-32 bg-stone-50 border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="block w-6 h-px bg-[#ea580c]" />
            <span className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-stone-500">
              {t.gallery.eyebrow}
            </span>
          </div>
          <h2 className="font-display font-black text-[clamp(32px,4vw,56px)] leading-tight tracking-tighter text-stone-900 mb-16">
            {t.gallery.headline}
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.gallery.items.map((item, i) => (
              <div
                key={i}
                className={`gallery-card bg-white border border-stone-200 overflow-hidden ${
                  i === 1 ? "lg:mt-8" : i === 3 ? "lg:mt-4" : ""
                }`}
              >
                <BeforeAfterSlider
                  before={item.before}
                  after={item.after}
                  beforeLabel={t.gallery.beforeLabel}
                  afterLabel={t.gallery.afterLabel}
                />
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display font-bold text-base text-stone-900">{item.name}</h3>
                    <span className="text-[10px] font-body text-stone-500 uppercase tracking-widest">
                      {item.duration}
                    </span>
                  </div>
                  <p className="text-[11px] font-body text-[#ea580c] font-bold tracking-widest uppercase mb-3">
                    {item.goal}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.stats.map((s, si) => (
                      <span
                        key={si}
                        className="text-[10px] font-body font-medium text-stone-600 bg-stone-100 px-2 py-1"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================
          13 — TESTIMONIALS
      ==================================================== */}
      <section className="py-24 lg:py-32 bg-white border-b border-stone-200 reveal-section">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="block w-6 h-px bg-[#ea580c]" />
            <span className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-stone-500">
              {t.testimonials.eyebrow}
            </span>
          </div>
          <h2 className="font-display font-black text-[clamp(32px,4vw,56px)] leading-tight tracking-tighter text-stone-900 mb-16">
            {t.testimonials.headline}
          </h2>

          <div className="grid sm:grid-cols-2 gap-6">
            {t.testimonials.items.map((item, i) => (
              <div
                key={i}
                className={`p-8 border border-stone-200 flex flex-col gap-6 ${
                  i === 1 ? "sm:mt-10" : i === 3 ? "sm:mt-6" : ""
                }`}
              >
                <p className="text-[15px] font-body text-stone-700 leading-relaxed flex-1">
                  "{item.text}"
                </p>
                <div className="flex items-center gap-3">
                  <img
                    src={item.img}
                    alt={item.name}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                  <div>
                    <p className="text-sm font-display font-bold text-stone-900">{item.name}</p>
                    <p className="text-[11px] font-body text-stone-500">{item.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================
          14 — RESOURCES
      ==================================================== */}
      <section className="py-24 lg:py-32 bg-stone-50 border-b border-stone-200 reveal-section">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="block w-6 h-px bg-[#ea580c]" />
            <span className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-stone-500">
              {t.resources.eyebrow}
            </span>
          </div>
          <h2 className="font-display font-black text-[clamp(32px,4vw,56px)] leading-tight tracking-tighter text-stone-900 mb-16">
            {t.resources.headline}
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-stone-200">
            {t.resources.items.map((item, i) => (
              <div
                key={i}
                className={`p-8 bg-white ${
                  i < 3 ? "border-e border-stone-200 rtl:border-e-0 rtl:border-s" : ""
                } ${i >= 2 ? "border-t border-stone-200 sm:border-t-0 lg:border-t-0" : ""} ${
                  i >= 1 && i < 3 ? "sm:border-t lg:border-t-0" : ""
                } ${i === 2 ? "sm:border-t lg:border-t-0" : ""}`}
              >
                <span className="text-2xl block mb-5 text-stone-400">{item.icon}</span>
                <h3 className="font-display font-bold text-base text-stone-900 mb-3 leading-snug">
                  {item.title}
                </h3>
                <p className="text-[13px] font-body text-stone-600 leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================
          15 — PRICING
      ==================================================== */}
      <section
        id="pricing"
        className="py-24 lg:py-32 bg-white border-b border-stone-200 reveal-section"
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="block w-6 h-px bg-[#ea580c]" />
            <span className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-stone-500">
              {t.pricing.eyebrow}
            </span>
          </div>
          <h2 className="font-display font-black text-[clamp(32px,4vw,56px)] leading-tight tracking-tighter text-stone-900 mb-4">
            {t.pricing.headline}
          </h2>
          <p className="text-[14px] font-body text-stone-500 mb-16 max-w-lg">
            {t.pricing.note}
          </p>

          <div className="grid md:grid-cols-3 gap-4 items-start">
            {t.pricing.packages.map((pkg, i) => (
              <div
                key={i}
                className={`flex flex-col border ${
                  pkg.featured
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-200 bg-white"
                } ${pkg.featured ? "md:-mt-4 md:pb-4" : ""}`}
              >
                {/* Tag */}
                <div className={`h-8 flex items-center justify-center ${pkg.featured ? "bg-[#ea580c]" : "bg-transparent"}`}>
                  {pkg.tag && (
                    <span className="text-[10px] font-body font-bold tracking-[0.2em] uppercase text-white">
                      {pkg.tag}
                    </span>
                  )}
                </div>

                <div className="p-8 flex flex-col flex-1 gap-6">
                  <div>
                    <h3 className={`font-display font-bold text-lg mb-4 ${pkg.featured ? "text-white" : "text-stone-900"}`}>
                      {pkg.name}
                    </h3>
                    <div className="flex items-baseline gap-1">
                      <span className={`font-display font-black text-[48px] leading-none tracking-tighter ${pkg.featured ? "text-white" : "text-stone-900"}`}>
                        {pkg.price}
                      </span>
                      <span className={`font-body text-sm ${pkg.featured ? "text-stone-400" : "text-stone-500"}`}>
                        {pkg.period}
                      </span>
                    </div>
                  </div>

                  <ul className="flex flex-col gap-3 flex-1">
                    {pkg.features.map((f, fi) => (
                      <li key={fi} className="flex items-start gap-3">
                        <span className="text-[#ea580c] flex-shrink-0 mt-0.5">✓</span>
                        <span className={`text-[13px] font-body leading-snug ${pkg.featured ? "text-stone-300" : "text-stone-600"}`}>
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <a
                    href="#"
                    className={`block text-center py-3.5 font-display font-bold text-[13px] tracking-wide uppercase transition-colors ${
                      pkg.featured
                        ? "bg-[#ea580c] text-white hover:bg-white hover:text-stone-900"
                        : "border border-stone-300 text-stone-900 hover:bg-stone-900 hover:text-white hover:border-stone-900"
                    }`}
                  >
                    {pkg.cta}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================
          16 — FAQ
      ==================================================== */}
      <section
        id="faq"
        className="py-24 lg:py-32 bg-stone-50 border-b border-stone-200 reveal-section"
      >
        <div className="max-w-4xl mx-auto px-5 sm:px-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="block w-6 h-px bg-[#ea580c]" />
            <span className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-stone-500">
              {t.faq.eyebrow}
            </span>
          </div>
          <h2 className="font-display font-black text-[clamp(32px,4vw,56px)] leading-tight tracking-tighter text-stone-900 mb-14">
            {t.faq.headline}
          </h2>
          <div>
            {t.faq.items.map((item, i) => (
              <AccordionItem key={i} q={item.q} a={item.a} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================
          17 — FINAL CTA BAND
      ==================================================== */}
      <section className="py-28 lg:py-40 bg-stone-900 text-white reveal-section">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="block w-6 h-px bg-[#ea580c]" />
            <span className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-stone-400">
              {t.cta.eyebrow}
            </span>
            <span className="block w-6 h-px bg-[#ea580c]" />
          </div>
          <h2 className="font-display font-black text-[clamp(48px,7vw,96px)] leading-[0.92] tracking-tighter mb-8 whitespace-pre-line">
            {t.cta.headline}
          </h2>
          <p className="text-[15px] font-body text-stone-400 mb-12 max-w-md mx-auto leading-relaxed">
            {t.cta.sub}
          </p>
          <a
            href="#"
            className="inline-flex items-center px-10 py-5 bg-[#ea580c] text-white font-display font-black text-[14px] tracking-wide uppercase hover:bg-white hover:text-stone-900 transition-colors duration-200"
          >
            {t.cta.btn}
          </a>
          <p className="mt-5 text-[12px] font-body text-stone-600 tracking-wide">
            {t.cta.trust}
          </p>
        </div>
      </section>

      {/* ====================================================
          18 — FOOTER
      ==================================================== */}
      <footer className="bg-stone-950 text-stone-400 pt-20 pb-10 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
            {/* Brand col */}
            <div className="lg:col-span-2">
              <a href="#" className="flex items-baseline gap-2 mb-4">
                <span className="font-display font-black text-2xl text-white">
                  {t.footer.logo}
                </span>
                <span className="text-xs font-body text-stone-600">
                  {t.footer.logoSub}
                </span>
              </a>
              <p className="text-[13px] font-body leading-relaxed max-w-xs text-stone-500 mb-6">
                {t.footer.tagline}
              </p>
              <a
                href={`mailto:${t.footer.contact}`}
                className="text-[12px] font-body text-stone-500 hover:text-white transition-colors"
              >
                {t.footer.contact}
              </a>
            </div>

            {/* Link groups */}
            {t.footer.groups.map((group, i) => (
              <div key={i}>
                <h4 className="text-[11px] font-body font-bold tracking-[0.2em] uppercase text-stone-600 mb-5">
                  {group.title}
                </h4>
                <ul className="flex flex-col gap-3">
                  {group.links.map((link, li) => (
                    <li key={li}>
                      <a
                        href="#"
                        className="text-[13px] font-body text-stone-500 hover:text-white transition-colors"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-stone-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] font-body text-stone-700">{t.footer.copyright}</p>
            <a
              href={locale === "en" ? "/ar" : "/en"}
              className="text-[11px] font-body text-stone-600 hover:text-white tracking-widest uppercase transition-colors"
            >
              {locale === "en" ? "العربية" : "English"}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/*
 * ============================================================
 * SHAPE REFERENCE
 * ============================================================
 *
 * content.en = {
 *   nav:          { logo, logoSub, links: [{ label, href }], cta }
 *   hero:         { eyebrow, line1, line2, line3Prefix, line3Accent, sub, cta1, cta2, badge1–3 }
 *   trust:        [{ value, label }]
 *   marquee:      [string]
 *   stats:        [{ number, suffix, label }]
 *   about:        { eyebrow, name, title, body1, body2, quote, certs: [string] }
 *   why:          { eyebrow, headline, items: [{ title, body }] }
 *   forWho:       { eyebrow, headline, items: [{ icon, label }], cta }
 *   method:       { eyebrow, headline, steps: [{ num, title, body }] }
 *   services:     { eyebrow, headline, items: [{ num, title, tag, body, cta, img }] }
 *   featured:     { eyebrow, name, goal, duration, story, stats: [{ value, label }], beforeLabel, afterLabel }
 *   gallery:      { eyebrow, headline, items: [{ name, goal, duration, stats, before, after }], beforeLabel, afterLabel }
 *   testimonials: { eyebrow, headline, items: [{ text, name, detail, img }] }
 *   resources:    { eyebrow, headline, items: [{ icon, title, body }] }
 *   pricing:      { eyebrow, headline, note, packages: [{ name, price, period, tag, features, cta, featured }] }
 *   faq:          { eyebrow, headline, items: [{ q, a }] }
 *   cta:          { eyebrow, headline, sub, btn, trust }
 *   footer:       { logo, logoSub, tagline, groups: [{ title, links }], contact, copyright }
 * }
 *
 * content.ar = { ...same shape in Arabic... }
 *
 * images = {
 *   coachHero, coachAbout, service1–3,
 *   featuredBefore, featuredAfter,
 *   before1–4, after1–4,
 *   testimonial1–4
 * }
 * ============================================================
 */