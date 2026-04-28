/*
 * ============================================================
 * FITNESS COACH LANDING PAGE — page.jsx
 * ============================================================
 *
 * IMAGE KEYS TO REPLACE (all sourced from `images` object):
 *   images.coachHero        — coach portrait in hero section
 *   images.coachAbout       — coach photo in about section
 *   images.service1         — online coaching service image
 *   images.service2         — nutrition coaching image
 *   images.service3         — transformation program image
 *   images.featuredBefore   — featured transformation before
 *   images.featuredAfter    — featured transformation after
 *   images.before1..6       — gallery before images
 *   images.after1..6        — gallery after images
 *   images.testimonial1..5  — client profile photos
 *
 * FONT CLASSES USED:
 *   font-display  → bold display/heading font (configured in tailwind.config)
 *   font-body     → body copy font
 *
 * LOCALIZATION STRATEGY:
 *   useLocale() from next-intl detects 'ar' or 'en'
 *   All copy lives in `content.ar` and `content.en` objects
 *   No useTranslations / no external message files
 *
 * GSAP PLUGINS:
 *   gsap core
 *   ScrollTrigger
 *   Draggable (for before/after slider)
 * ============================================================
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useLocale } from "next-intl";

// ─── CENTRALIZED IMAGE REGISTRY ─────────────────────────────
const images = {
  coachHero:
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=900&q=85&fit=crop",
  coachAbout:
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80&fit=crop",
  service1:
    "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=700&q=80&fit=crop",
  service2:
    "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=700&q=80&fit=crop",
  service3:
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=700&q=80&fit=crop",
  featuredBefore:
    "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800&q=80&fit=crop",
  featuredAfter:
    "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80&fit=crop",
  before1:
    "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=500&q=75&fit=crop",
  after1:
    "https://images.unsplash.com/photo-1570440828843-3d66dd9f5c38?w=500&q=75&fit=crop",
  before2:
    "https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=500&q=75&fit=crop",
  after2:
    "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=500&q=75&fit=crop",
  before3:
    "https://images.unsplash.com/photo-1547941126-3d5322b218b0?w=500&q=75&fit=crop",
  after3:
    "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=500&q=75&fit=crop",
  before4:
    "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=500&q=75&fit=crop",
  after4:
    "https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=500&q=75&fit=crop",
  before5:
    "https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=500&q=75&fit=crop",
  after5:
    "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=500&q=75&fit=crop",
  before6:
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&q=75&fit=crop",
  after6:
    "https://images.unsplash.com/photo-1540496905036-5937c10647cc?w=500&q=75&fit=crop",
  testimonial1:
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80&fit=crop&crop=face",
  testimonial2:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80&fit=crop&crop=face",
  testimonial3:
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80&fit=crop&crop=face",
  testimonial4:
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80&fit=crop&crop=face",
  testimonial5:
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80&fit=crop&crop=face",
};

// ─── LOCALIZED CONTENT OBJECT ────────────────────────────────
const content = {
  en: {
    nav: {
      logo: "Apex",
      tagline: "Coaching",
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
      label: "Elite Personal Training",
      headline1: "Train with",
      headline2: "purpose.",
      headline3: "Get results.",
      highlighted: "purpose.",
      sub: "Custom programming, nutrition guidance, and weekly accountability — built around how you actually live.",
      cta1: "Apply for Coaching",
      cta2: "See Transformations",
      badge1: "500+ Clients",
      badge2: "8 Years Coaching",
      imageAlt: "Coach portrait",
    },
    trust: [
      { value: "8+", label: "Years of experience" },
      { value: "500+", label: "Transformations" },
      { value: "3", label: "Certifications" },
      { value: "4.9★", label: "Average rating" },
      { value: "12", label: "Countries served" },
    ],
    marquee: [
      "NSCA Certified",
      "Science-Based Programming",
      "Online & In-Person",
      "Nutrition Coaching",
      "Precision Accountability",
      "Body Recomposition",
      "Strength & Conditioning",
      "Fat Loss Specialists",
      "Evidence-Based Methods",
    ],
    stats: [
      { number: 500, suffix: "+", label: "Clients Transformed" },
      { number: 8, suffix: " yrs", label: "Coaching Experience" },
      { number: 94, suffix: "%", label: "Goal Achievement Rate" },
      { number: 12, suffix: "", label: "Countries Reached" },
    ],
    about: {
      label: "The Coach",
      name: "Ahmed Karim",
      title: "NSCA-CPT · Precision Nutrition Coach",
      story:
        "I've spent eight years learning what actually works — not what sells. My approach is built on structured programming, consistent nutrition habits, and real accountability. Not gimmicks, not extremes.",
      philosophy:
        '"Real change happens between sessions, not during them. My job is to build the system that keeps you consistent when motivation runs out."',
      tags: ["NSCA-CPT", "Precision Nutrition", "PN1", "Strength & Conditioning"],
      imageAlt: "Coach Ahmed Karim",
    },
    why: {
      label: "Why This Matters",
      headline: "Generic programs fail. This doesn't.",
      items: [
        {
          title: "Built around your life",
          desc: "Not a cookie-cutter plan. Every program is designed around your schedule, equipment, and physical starting point.",
        },
        {
          title: "Science, not trends",
          desc: "Programming grounded in exercise physiology and behavior science — not whatever's viral this month.",
        },
        {
          title: "Nutrition that sticks",
          desc: "No extreme diets. Sustainable food strategies that work with your culture, preferences, and lifestyle.",
        },
        {
          title: "Real accountability",
          desc: "Weekly check-ins, form reviews, and plan adjustments. You're never left figuring it out alone.",
        },
        {
          title: "Progress that compounds",
          desc: "Month-over-month adjustments based on your actual data — not guesswork.",
        },
        {
          title: "Online or in-person",
          desc: "Full coaching experience remotely. No commute required. Results don't depend on location.",
        },
      ],
    },
    forWho: {
      label: "Who This Is For",
      headline: "This works if you're ready to commit.",
      items: [
        { title: "Fat loss", desc: "Sustainable, structured, without crash dieting." },
        { title: "Muscle gain", desc: "Hypertrophy programming built to actually build." },
        { title: "Recomposition", desc: "Lose fat. Gain muscle. Do both, done right." },
        { title: "Beginners", desc: "Start with zero gym experience. Leave with a foundation." },
        { title: "Busy professionals", desc: "30–45 min sessions. Maximum output. No wasted time." },
        { title: "Online clients", desc: "Full accountability, anywhere in the world." },
        { title: "Women", desc: "Programs specifically designed for female physiology." },
        { title: "Men", desc: "Strength-first. Conditioning included. No fluff." },
      ],
    },
    method: {
      label: "The Method",
      headline: "How coaching actually works.",
      steps: [
        {
          num: "01",
          title: "Deep Assessment",
          desc: "Intake form, video call, training history, and goal audit. We start from an honest baseline.",
        },
        {
          num: "02",
          title: "Your Custom Plan",
          desc: "Training program built for your equipment, schedule, and body — delivered in week one.",
        },
        {
          num: "03",
          title: "Nutrition Setup",
          desc: "Calorie targets, macro ratios, food strategies, and meal timing — practical, not extreme.",
        },
        {
          num: "04",
          title: "Weekly Check-ins",
          desc: "Progress photos, weight trends, performance data reviewed every 7 days. Adjustments made fast.",
        },
        {
          num: "05",
          title: "Ongoing Optimization",
          desc: "As you progress, the plan evolves. Plateaus get broken. Momentum is protected.",
        },
        {
          num: "06",
          title: "Full Support",
          desc: "Direct messaging access between check-ins. Questions get answered. Guidance stays consistent.",
        },
      ],
    },
    services: {
      label: "Programs",
      headline: "Three ways to work together.",
      items: [
        {
          num: "01",
          title: "Online Coaching",
          sub: "Full-service remote program",
          desc: "Custom training + nutrition + weekly check-ins. My most complete program, built for serious clients worldwide.",
          cta: "Apply Now",
          imageAlt: "Online coaching",
        },
        {
          num: "02",
          title: "Nutrition Only",
          sub: "Precision food strategy",
          desc: "No training component — just a structured, sustainable nutrition plan aligned with your specific goals.",
          cta: "Learn More",
          imageAlt: "Nutrition coaching",
        },
        {
          num: "03",
          title: "Transformation Package",
          sub: "12-week intensive program",
          desc: "Condensed, results-driven coaching. Designed for clients who want maximum progress in a fixed timeframe.",
          cta: "View Details",
          imageAlt: "Transformation program",
        },
      ],
    },
    featured: {
      label: "Featured Result",
      headline: "12 weeks. 14kg lost. Kept every bit of muscle.",
      client: "Tariq M., 31",
      story:
        "Tariq came in after two years of inconsistent gym habits and no real nutrition structure. By month two he was already seeing changes he'd never seen before.",
      stats: [
        { value: "14kg", label: "Lost" },
        { value: "12", label: "Weeks" },
        { value: "4kg", label: "Muscle Retained" },
        { value: "31%→19%", label: "Body Fat" },
      ],
      beforeLabel: "Before",
      afterLabel: "After",
      beforeAlt: "Tariq before transformation",
      afterAlt: "Tariq after transformation",
    },
    gallery: {
      label: "Client Results",
      headline: "Proof, not promises.",
      beforeLabel: "Before",
      afterLabel: "After",
      clients: [
        {
          name: "Sara K.",
          duration: "16 weeks",
          goal: "Fat Loss",
          stats: ["−11kg", "−9% Body Fat", "Maintained Strength", "No Crash Diet"],
          beforeAlt: "Sara before",
          afterAlt: "Sara after",
          beforeImg: images.before1,
          afterImg: images.after1,
        },
        {
          name: "Omar R.",
          duration: "20 weeks",
          goal: "Recomposition",
          stats: ["−8kg Fat", "+4kg Muscle", "Stronger Lifts", "Better Sleep"],
          beforeAlt: "Omar before",
          afterAlt: "Omar after",
          beforeImg: images.before2,
          afterImg: images.after2,
        },
        {
          name: "Layla M.",
          duration: "12 weeks",
          goal: "Muscle Gain",
          stats: ["+5kg Lean Mass", "Stronger Compound Lifts", "Improved Recovery"],
          beforeAlt: "Layla before",
          afterAlt: "Layla after",
          beforeImg: images.before3,
          afterImg: images.after3,
        },
        {
          name: "Youssef A.",
          duration: "24 weeks",
          goal: "Fat Loss",
          stats: ["−18kg", "−14% Body Fat", "No Muscle Loss", "Off Medication"],
          beforeAlt: "Youssef before",
          afterAlt: "Youssef after",
          beforeImg: images.before4,
          afterImg: images.after4,
        },
        {
          name: "Nadia S.",
          duration: "14 weeks",
          goal: "Recomposition",
          stats: ["−7kg Fat", "+3kg Muscle", "Visible Definition", "Energy Improved"],
          beforeAlt: "Nadia before",
          afterAlt: "Nadia after",
          beforeImg: images.before5,
          afterImg: images.after5,
        },
        {
          name: "Khaled T.",
          duration: "18 weeks",
          goal: "Strength",
          stats: ["+40kg Squat", "+30kg Deadlift", "−5kg Body Fat"],
          beforeAlt: "Khaled before",
          afterAlt: "Khaled after",
          beforeImg: images.before6,
          afterImg: images.after6,
        },
      ],
    },
    testimonials: {
      label: "Client Voices",
      headline: "Straight from the people who showed up.",
      items: [
        {
          name: "Sara K.",
          detail: "28, Cairo",
          text: "I'd been going to the gym for three years and looked exactly the same. Eight weeks in with Ahmed and my whole body composition shifted. The structure changed everything.",
          img: images.testimonial1,
        },
        {
          name: "Omar R.",
          detail: "34, Dubai",
          text: "Never thought I'd say this but I actually enjoy training now. The programming makes sense. And the nutrition guidance was the missing piece I never had.",
          img: images.testimonial2,
        },
        {
          name: "Tariq M.",
          detail: "31, Amman",
          text: "Lost 14kg in 12 weeks and kept it off eight months later. Not magic. Just a plan that actually fit my life and someone who held me accountable.",
          img: images.testimonial3,
        },
        {
          name: "Nadia S.",
          detail: "26, London",
          text: "The check-ins kept me honest. I couldn't just skip and pretend it didn't happen. That structure was worth the investment on its own.",
          img: images.testimonial4,
        },
        {
          name: "Khaled T.",
          detail: "40, Riyadh",
          text: "As a busy professional I needed something that worked with my schedule, not against it. 40-minute sessions. Real results. Couldn't ask for more.",
          img: images.testimonial5,
        },
      ],
    },
    resources: {
      label: "Coaching Tools",
      headline: "Built-in support beyond the workout.",
      items: [
        {
          icon: "🥗",
          title: "Calorie & Macro Guidance",
          desc: "Personalized targets built around your TDEE, goals, and food preferences. Reviewed and adjusted monthly.",
        },
        {
          icon: "🔄",
          title: "Food Swap Library",
          desc: "Alternatives for every major food category. Eat culturally relevant, satisfying food — within your targets.",
        },
        {
          icon: "📋",
          title: "Nutrition Education",
          desc: "Understand why the plan works, not just what to eat. Clients who understand make better decisions.",
        },
        {
          icon: "📊",
          title: "Progress Tracking Tools",
          desc: "Structured check-in sheets, body measurement trackers, and performance logging — all provided.",
        },
      ],
    },
    pricing: {
      label: "Investment",
      headline: "Choose your level.",
      tiers: [
        {
          name: "Starter",
          price: "$149",
          period: "/month",
          desc: "For those just getting started with structured training.",
          features: [
            "Custom training program",
            "Bi-weekly check-ins",
            "Nutrition targets",
            "Email support",
          ],
          cta: "Get Started",
          featured: false,
        },
        {
          name: "Full Coaching",
          price: "$249",
          period: "/month",
          desc: "The complete coaching experience. Most clients choose this.",
          features: [
            "Custom training + nutrition",
            "Weekly check-ins",
            "Form video reviews",
            "Direct messaging",
            "Monthly plan adjustments",
            "Priority support",
          ],
          cta: "Apply Now",
          featured: true,
        },
        {
          name: "Transformation",
          price: "$599",
          period: "/12 weeks",
          desc: "Intensive 12-week program with maximum coaching touch.",
          features: [
            "Everything in Full Coaching",
            "Twice-weekly check-ins",
            "Detailed progress reports",
            "End-of-program analysis",
            "Transition plan included",
          ],
          cta: "Apply Now",
          featured: false,
        },
      ],
    },
    faq: {
      label: "FAQ",
      headline: "Answers to real questions.",
      items: [
        {
          q: "Do I need gym access?",
          a: "No. Programs are written for whatever equipment you have — full gym, home setup, or just bodyweight. You tell me, I build around it.",
        },
        {
          q: "How quickly will I see results?",
          a: "Most clients notice changes in weeks 3–4. Visible, photograph-able results typically show by week 8. Exact timelines depend on starting point and consistency.",
        },
        {
          q: "Is nutrition coaching included?",
          a: "Yes in Full Coaching and Transformation tiers. Nutrition-only is available as a standalone service. Starter includes macro targets only.",
        },
        {
          q: "What if I travel or my schedule changes?",
          a: "Plans are adjusted. Coaching adapts to your life — that's the entire point. A week off or a travel period doesn't derail the whole program.",
        },
        {
          q: "How does online coaching compare to in-person?",
          a: "For most goals — fat loss, muscle gain, recomposition — results are equivalent when accountability is high. The check-in structure replicates the accountability of in-person work.",
        },
        {
          q: "Do I need to commit long-term?",
          a: "Minimum commitment is one month for Starter/Full Coaching, 12 weeks for Transformation. Month-to-month after that. No lock-ins beyond the initial period.",
        },
      ],
    },
    cta: {
      label: "Ready",
      headline: "Start training like you mean it.",
      sub: "Limited spots open. Applications reviewed within 48 hours.",
      button: "Apply for Coaching",
      trust: "No contracts. Cancel any time after the first month.",
    },
    footer: {
      tagline: "Elite coaching. Real results.",
      navGroups: [
        {
          title: "Program",
          links: ["Online Coaching", "Nutrition", "Transformation"],
        },
        {
          title: "Information",
          links: ["About", "Method", "Results"],
        },
        {
          title: "Contact",
          links: ["Email Coach", "Instagram", "WhatsApp"],
        },
      ],
      copy: `© ${new Date().getFullYear()} Apex Coaching. All rights reserved.`,
      social: ["Instagram", "YouTube", "TikTok"],
    },
    lang: "EN",
    langSwitch: "AR",
  },

  ar: {
    nav: {
      logo: "أبيكس",
      tagline: "كوتشينج",
      links: [
        { label: "عن المدرب", href: "#about" },
        { label: "المنهج", href: "#method" },
        { label: "النتائج", href: "#results" },
        { label: "الأسعار", href: "#pricing" },
        { label: "الأسئلة", href: "#faq" },
      ],
      cta: "ابدأ الآن",
    },
    hero: {
      label: "تدريب شخصي احترافي",
      headline1: "تدرب",
      headline2: "بهدف.",
      headline3: "احقق نتائج.",
      highlighted: "بهدف.",
      sub: "برامج تدريب مخصصة، إرشاد تغذوي، ومتابعة أسبوعية — مبنية حول حياتك الفعلية.",
      cta1: "قدّم طلبك الآن",
      cta2: "شاهد التحولات",
      badge1: "+500 عميل",
      badge2: "8 سنوات خبرة",
      imageAlt: "صورة المدرب",
    },
    trust: [
      { value: "+8", label: "سنوات خبرة" },
      { value: "+500", label: "تحول ناجح" },
      { value: "3", label: "شهادات احترافية" },
      { value: "4.9★", label: "متوسط التقييم" },
      { value: "12", label: "دولة خدمت" },
    ],
    marquee: [
      "شهادة NSCA",
      "برامج علمية مدروسة",
      "أونلاين وحضوري",
      "إرشاد تغذوي",
      "محاسبة دقيقة",
      "إعادة تكوين الجسم",
      "القوة والتكييف",
      "متخصصون في إنقاص الدهون",
      "أساليب قائمة على الأدلة",
    ],
    stats: [
      { number: 500, suffix: "+", label: "عميل تحوّل" },
      { number: 8, suffix: " سنة", label: "خبرة في التدريب" },
      { number: 94, suffix: "%", label: "نسبة تحقيق الأهداف" },
      { number: 12, suffix: "", label: "دولة حول العالم" },
    ],
    about: {
      label: "المدرب",
      name: "أحمد كريم",
      title: "NSCA-CPT · مدرب تغذية دقيقة معتمد",
      story:
        "قضيت ثماني سنوات أتعلم ما يصلح فعلاً — لا ما يُباع. منهجي مبني على برمجة منظمة، وعادات تغذية ثابتة، ومحاسبة حقيقية. لا حيل، ولا تطرف.",
      philosophy:
        '"التغيير الحقيقي يحدث بين الجلسات، لا خلالها. مهمتي بناء النظام الذي يُبقيك ثابتاً حين تنتهي الحماس."',
      tags: ["NSCA-CPT", "تغذية دقيقة", "PN1", "القوة والتكييف"],
      imageAlt: "المدرب أحمد كريم",
    },
    why: {
      label: "لماذا يهم هذا",
      headline: "البرامج العامة تفشل. هذا لا يفشل.",
      items: [
        {
          title: "مبني حول حياتك",
          desc: "ليس نموذجاً جاهزاً. كل برنامج مصمم حول جدولك وأجهزتك ونقطة انطلاقك.",
        },
        {
          title: "علم لا موضة",
          desc: "برمجة مبنية على علم وظائف الأعضاء وعلم السلوك — لا على ما هو رائج هذا الشهر.",
        },
        {
          title: "تغذية تدوم",
          desc: "لا أنظمة متطرفة. استراتيجيات غذائية مستدامة تتناسب مع ثقافتك وتفضيلاتك.",
        },
        {
          title: "محاسبة حقيقية",
          desc: "متابعة أسبوعية، مراجعة الأداء، وتعديل الخطة. لن تُترك وحدك.",
        },
        {
          title: "تقدم يتراكم",
          desc: "تعديلات شهرية بناءً على بياناتك الفعلية — لا تخمين.",
        },
        {
          title: "أونلاين أو حضوري",
          desc: "تجربة تدريب كاملة عن بُعد. النتائج لا تعتمد على الموقع.",
        },
      ],
    },
    forWho: {
      label: "لمن هذا",
      headline: "هذا يناسبك إذا كنت مستعداً للالتزام.",
      items: [
        { title: "إنقاص الوزن", desc: "مستدام، منظم، بدون حمية قاسية." },
        { title: "بناء العضلات", desc: "برمجة ضخامة مبنية للنتائج." },
        { title: "إعادة تكوين الجسم", desc: "أنقص الدهون. اكتسب عضلاً. الاثنان معاً." },
        { title: "المبتدئون", desc: "ابدأ بدون خبرة. انتهِ بأساس متين." },
        { title: "المشغولون", desc: "جلسات 30-45 دقيقة. أقصى نتائج. لا وقت ضائع." },
        { title: "العملاء عن بُعد", desc: "متابعة كاملة، من أي مكان في العالم." },
        { title: "النساء", desc: "برامج مصممة خصيصاً لفسيولوجيا المرأة." },
        { title: "الرجال", desc: "قوة أولاً. تكييف مضمّن. لا حشو." },
      ],
    },
    method: {
      label: "المنهج",
      headline: "كيف يعمل التدريب فعلاً.",
      steps: [
        {
          num: "01",
          title: "التقييم الشامل",
          desc: "استمارة تفصيلية، مكالمة فيديو، تاريخ تدريبي وتحليل الأهداف. نبدأ من خط أساس صادق.",
        },
        {
          num: "02",
          title: "خطتك المخصصة",
          desc: "برنامج تدريبي مبني لأجهزتك وجدولك وجسمك — يُسلَّم في الأسبوع الأول.",
        },
        {
          num: "03",
          title: "إعداد التغذية",
          desc: "أهداف سعرات، نسب ماكرو، استراتيجيات غذائية وتوقيت الوجبات — عملي لا متطرف.",
        },
        {
          num: "04",
          title: "متابعة أسبوعية",
          desc: "صور التقدم، اتجاهات الوزن، وبيانات الأداء تُراجع كل 7 أيام. تعديلات سريعة.",
        },
        {
          num: "05",
          title: "تحسين مستمر",
          desc: "مع تقدمك، تتطور الخطة. الأفطاس تُكسر. الزخم محمي.",
        },
        {
          num: "06",
          title: "دعم كامل",
          desc: "تواصل مباشر بين المتابعات. الأسئلة تُجاب. التوجيه ثابت.",
        },
      ],
    },
    services: {
      label: "البرامج",
      headline: "ثلاث طرق للعمل معاً.",
      items: [
        {
          num: "01",
          title: "التدريب الأونلاين",
          sub: "برنامج متكامل عن بُعد",
          desc: "تدريب مخصص + تغذية + متابعة أسبوعية. برنامجي الأشمل للعملاء الجادين حول العالم.",
          cta: "قدّم الآن",
          imageAlt: "التدريب الأونلاين",
        },
        {
          num: "02",
          title: "التغذية فقط",
          sub: "استراتيجية تغذوية دقيقة",
          desc: "بدون مكون تدريبي — خطة غذائية منظمة ومستدامة تتوافق مع أهدافك المحددة.",
          cta: "اعرف أكثر",
          imageAlt: "إرشاد تغذوي",
        },
        {
          num: "03",
          title: "برنامج التحول",
          sub: "برنامج مكثف 12 أسبوعاً",
          desc: "تدريب مُكثّف موجه للنتائج. مصمم للعملاء الذين يريدون أقصى تقدم في إطار زمني محدد.",
          cta: "التفاصيل",
          imageAlt: "برنامج التحول",
        },
      ],
    },
    featured: {
      label: "نتيجة مميزة",
      headline: "12 أسبوع. 14 كيلو خسر. محافظ على كل عضلة.",
      client: "طارق م.، 31 سنة",
      story:
        "طارق جاءني بعد سنتين من التمارين غير المنتظمة وبلا بنية تغذوية. في الشهر الثاني كان يرى تغييرات لم يرها من قبل في حياته.",
      stats: [
        { value: "14كجم", label: "خسر" },
        { value: "12", label: "أسبوع" },
        { value: "4كجم", label: "عضل محافظ عليه" },
        { value: "31%←19%", label: "دهون الجسم" },
      ],
      beforeLabel: "قبل",
      afterLabel: "بعد",
      beforeAlt: "طارق قبل التحول",
      afterAlt: "طارق بعد التحول",
    },
    gallery: {
      label: "نتائج العملاء",
      headline: "دليل، لا وعود.",
      beforeLabel: "قبل",
      afterLabel: "بعد",
      clients: [
        {
          name: "سارة ك.",
          duration: "16 أسبوع",
          goal: "إنقاص الوزن",
          stats: ["−11 كجم", "−9% دهون", "حافظت على قوتها", "بدون حمية قاسية"],
          beforeAlt: "سارة قبل",
          afterAlt: "سارة بعد",
          beforeImg: images.before1,
          afterImg: images.after1,
        },
        {
          name: "عمر ر.",
          duration: "20 أسبوع",
          goal: "إعادة تكوين الجسم",
          stats: ["−8 كجم دهون", "+4 كجم عضل", "أقوى", "نوم أفضل"],
          beforeAlt: "عمر قبل",
          afterAlt: "عمر بعد",
          beforeImg: images.before2,
          afterImg: images.after2,
        },
        {
          name: "ليلى م.",
          duration: "12 أسبوع",
          goal: "بناء العضلات",
          stats: ["+5 كجم كتلة عضلية", "تمارين مركبة أقوى", "تعافٍ أسرع"],
          beforeAlt: "ليلى قبل",
          afterAlt: "ليلى بعد",
          beforeImg: images.before3,
          afterImg: images.after3,
        },
        {
          name: "يوسف أ.",
          duration: "24 أسبوع",
          goal: "إنقاص الوزن",
          stats: ["−18 كجم", "−14% دهون", "لا خسارة عضلية", "توقف عن الدواء"],
          beforeAlt: "يوسف قبل",
          afterAlt: "يوسف بعد",
          beforeImg: images.before4,
          afterImg: images.after4,
        },
        {
          name: "نادية س.",
          duration: "14 أسبوع",
          goal: "إعادة تكوين",
          stats: ["−7 كجم دهون", "+3 كجم عضل", "تعريف واضح", "طاقة أعلى"],
          beforeAlt: "نادية قبل",
          afterAlt: "نادية بعد",
          beforeImg: images.before5,
          afterImg: images.after5,
        },
        {
          name: "خالد ت.",
          duration: "18 أسبوع",
          goal: "القوة",
          stats: ["+40 كجم سكوات", "+30 كجم ديدليفت", "−5 كجم دهون"],
          beforeAlt: "خالد قبل",
          afterAlt: "خالد بعد",
          beforeImg: images.before6,
          afterImg: images.after6,
        },
      ],
    },
    testimonials: {
      label: "أصوات العملاء",
      headline: "مباشرة من الأشخاص الذين التزموا.",
      items: [
        {
          name: "سارة ك.",
          detail: "28، القاهرة",
          text: "كنت أذهب للجيم ثلاث سنوات وجسمي لم يتغير. بعد ثمانية أسابيع مع أحمد، تغيّر تركيب جسمي كلياً. البنية غيّرت كل شيء.",
          img: images.testimonial1,
        },
        {
          name: "عمر ر.",
          detail: "34، دبي",
          text: "لم أتوقع يوماً أن أقول هذا لكنني أستمتع بالتدريب الآن. البرمجة منطقية. وإرشاد التغذية كان القطعة الناقصة التي لم أجدها قط.",
          img: images.testimonial2,
        },
        {
          name: "طارق م.",
          detail: "31، عمّان",
          text: "أنقصت 14 كيلو في 12 أسبوع والوزن ثابت منذ ثمانية أشهر. لا معجزات. فقط خطة تناسب حياتي وشخص يحاسبني.",
          img: images.testimonial3,
        },
        {
          name: "نادية س.",
          detail: "26، لندن",
          text: "المتابعات أبقتني أميناً مع نفسي. لم أستطع الغياب والتظاهر. هذه البنية كانت تستحق الاستثمار وحدها.",
          img: images.testimonial4,
        },
        {
          name: "خالد ت.",
          detail: "40، الرياض",
          text: "بصفتي محترفاً مشغولاً، احتجت شيئاً يعمل مع جدولي لا ضده. جلسات 40 دقيقة. نتائج حقيقية. لا أطلب أكثر.",
          img: images.testimonial5,
        },
      ],
    },
    resources: {
      label: "أدوات التدريب",
      headline: "دعم مدمج يتجاوز التمرين.",
      items: [
        {
          icon: "🥗",
          title: "إرشاد السعرات والماكرو",
          desc: "أهداف مخصصة مبنية حول احتياجاتك الطاقية وأهدافك وتفضيلاتك الغذائية. تُراجع وتُعدَّل شهرياً.",
        },
        {
          icon: "🔄",
          title: "مكتبة بدائل الطعام",
          desc: "بدائل لكل فئة غذائية رئيسية. كُل طعاماً ملائماً ثقافياً ومُشبعاً — ضمن أهدافك.",
        },
        {
          icon: "📋",
          title: "تثقيف تغذوي",
          desc: "افهم لماذا تعمل الخطة، لا فقط ماذا تأكل. العملاء الذين يفهمون يتخذون قرارات أفضل.",
        },
        {
          icon: "📊",
          title: "أدوات تتبع التقدم",
          desc: "استمارات متابعة منظمة، متعقبات قياسات الجسم، وسجلات الأداء — كلها مزوّدة.",
        },
      ],
    },
    pricing: {
      label: "الاستثمار",
      headline: "اختر مستواك.",
      tiers: [
        {
          name: "البداية",
          price: "149$",
          period: "/شهر",
          desc: "لمن يبدأ لأول مرة مع تدريب منظم.",
          features: [
            "برنامج تدريبي مخصص",
            "متابعة كل أسبوعين",
            "أهداف تغذية",
            "دعم بالبريد الإلكتروني",
          ],
          cta: "ابدأ الآن",
          featured: false,
        },
        {
          name: "التدريب الكامل",
          price: "249$",
          period: "/شهر",
          desc: "تجربة التدريب الكاملة. أغلب العملاء يختارون هذا.",
          features: [
            "تدريب + تغذية مخصص",
            "متابعة أسبوعية",
            "مراجعة فيديو الأداء",
            "مراسلة مباشرة",
            "تعديلات شهرية",
            "دعم ذو أولوية",
          ],
          cta: "قدّم الآن",
          featured: true,
        },
        {
          name: "برنامج التحول",
          price: "599$",
          period: "/12 أسبوع",
          desc: "برنامج مكثف 12 أسبوعاً بأقصى تواصل مع المدرب.",
          features: [
            "كل ما في التدريب الكامل",
            "متابعة مرتين أسبوعياً",
            "تقارير تقدم مفصّلة",
            "تحليل نهاية البرنامج",
            "خطة انتقالية مضمّنة",
          ],
          cta: "قدّم الآن",
          featured: false,
        },
      ],
    },
    faq: {
      label: "الأسئلة الشائعة",
      headline: "إجابات على أسئلة حقيقية.",
      items: [
        {
          q: "هل أحتاج صالة رياضية؟",
          a: "لا. البرامج تُكتب لأي جهاز متاح لك — صالة كاملة، إعداد منزلي، أو وزن الجسم فقط. أخبرني وأبني حوله.",
        },
        {
          q: "متى سأرى نتائج؟",
          a: "معظم العملاء يلاحظون تغييرات في الأسبوع 3-4. نتائج مرئية وقابلة للتصوير تظهر عادةً بحلول الأسبوع 8. الجداول الدقيقة تعتمد على نقطة البداية والثبات.",
        },
        {
          q: "هل إرشاد التغذية مضمّن؟",
          a: "نعم في التدريب الكامل وبرنامج التحول. التغذية فقط متاحة كخدمة منفصلة. البداية تشمل أهداف الماكرو فقط.",
        },
        {
          q: "ماذا لو سافرت أو تغيّر جدولي؟",
          a: "تتكيف الخطط. التدريب يتكيف مع حياتك — هذا هو المغزى الكامل. أسبوع غياب أو سفر لا يُفسد البرنامج كله.",
        },
        {
          q: "كيف يُقارن التدريب الأونلاين بالحضوري؟",
          a: "لمعظم الأهداف — إنقاص الوزن، بناء العضلات، إعادة التكوين — النتائج متعادلة عند محاسبة عالية. هيكل المتابعة يُكرر محاسبة التدريب الحضوري.",
        },
        {
          q: "هل يجب أن ألتزم طويلاً؟",
          a: "الحد الأدنى شهر واحد للبداية والتدريب الكامل، و12 أسبوعاً للتحول. شهراً بشهر بعد ذلك. لا قيود بعد الفترة الأولية.",
        },
      ],
    },
    cta: {
      label: "الجاهز",
      headline: "ابدأ التدريب كما ينبغي.",
      sub: "أماكن محدودة. الطلبات تُراجع خلال 48 ساعة.",
      button: "قدّم طلبك للتدريب",
      trust: "لا عقود ملزمة. إلغاء في أي وقت بعد الشهر الأول.",
    },
    footer: {
      tagline: "تدريب احترافي. نتائج حقيقية.",
      navGroups: [
        {
          title: "البرامج",
          links: ["التدريب الأونلاين", "التغذية", "التحول"],
        },
        {
          title: "معلومات",
          links: ["عن المدرب", "المنهج", "النتائج"],
        },
        {
          title: "التواصل",
          links: ["راسل المدرب", "إنستجرام", "واتساب"],
        },
      ],
      copy: `© ${new Date().getFullYear()} أبيكس كوتشينج. جميع الحقوق محفوظة.`,
      social: ["إنستجرام", "يوتيوب", "تيك توك"],
    },
    lang: "AR",
    langSwitch: "EN",
  },
};

// ─── BEFORE/AFTER SLIDER COMPONENT ──────────────────────────
function BeforeAfterSlider({ beforeImg, afterImg, beforeAlt, afterAlt, beforeLabel, afterLabel }) {
  const containerRef = useRef(null);
  const [position, setPosition] = useState(50);
  const dragging = useRef(false);

  const getPos = useCallback((clientX) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return 50;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return (x / rect.width) * 100;
  }, []);

  const onMouseDown = (e) => { dragging.current = true; e.preventDefault(); };
  const onMouseMove = (e) => { if (dragging.current) setPosition(getPos(e.clientX)); };
  const onMouseUp = () => { dragging.current = false; };
  const onTouchStart = () => { dragging.current = true; };
  const onTouchMove = (e) => { if (dragging.current) setPosition(getPos(e.touches[0].clientX)); };
  const onTouchEnd = () => { dragging.current = false; };

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  });

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none cursor-col-resize"
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {/* After (full width) */}
      <img src={afterImg} alt={afterAlt} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
      {/* Before (clipped) */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
        <img src={beforeImg} alt={beforeAlt} className="absolute inset-0 w-full h-full object-cover" style={{ width: containerRef.current ? `${containerRef.current.offsetWidth}px` : "100%" }} draggable={false} />
      </div>
      {/* Divider */}
      <div className="absolute top-0 bottom-0 w-px bg-white/80" style={{ left: `${position}%` }}>
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center border border-stone-200">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M5 8l-3 3M5 8L2 5M11 8l3 3M11 8l3-3" stroke="#111" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      {/* Labels */}
      <span className="absolute top-3 start-3 text-xs font-body font-semibold tracking-widest uppercase text-white bg-black/50 px-2 py-1">{beforeLabel}</span>
      <span className="absolute top-3 end-3 text-xs font-body font-semibold tracking-widest uppercase text-white bg-black/50 px-2 py-1">{afterLabel}</span>
    </div>
  );
}

// ─── FAQ ITEM ────────────────────────────────────────────────
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef(null);

  return (
    <div className="border-b border-stone-200">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-start group"
        aria-expanded={open}
      >
        <span className="font-body font-semibold text-stone-900 text-base group-hover:text-orange-600 transition-colors duration-200">
          {q}
        </span>
        <span className={`ms-4 shrink-0 w-6 h-6 rounded-full border border-stone-300 flex items-center justify-center transition-transform duration-300 ${open ? "rotate-45" : ""}`}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 1v8M1 5h8" stroke="#111" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
      </button>
      <div
        ref={bodyRef}
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: open ? bodyRef.current?.scrollHeight + "px" : "0px" }}
      >
        <p className="font-body text-stone-500 text-sm leading-relaxed pb-5">{a}</p>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────
export default function CoachLanding() {
  const locale = useLocale();
  const t = content[locale] || content.en;
  const isAr = locale === "ar";

  // Refs for GSAP
  const heroRef = useRef(null);
  const heroImgRef = useRef(null);
  const heroHeadRef = useRef(null);
  const heroCtaRef = useRef(null);
  const heroBadge1Ref = useRef(null);
  const heroBadge2Ref = useRef(null);
  const trustRef = useRef(null);
  const statsRef = useRef(null);
  const statNumRefs = useRef([]);
  const marqueeRef = useRef(null);
  const aboutImgRef = useRef(null);
  const aboutTextRef = useRef(null);
  const navRef = useRef(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // ── GSAP ANIMATIONS ────────────────────────────────────────
  useEffect(() => {
    let ctx;
    const initGsap = async () => {
      const { default: gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        // Hero timeline
        const tl = gsap.timeline({ delay: 0.2 });
        const headLines = heroHeadRef.current?.querySelectorAll(".reveal-line");
        if (headLines?.length) {
          tl.fromTo(
            headLines,
            { yPercent: 110  },
            { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.12, ease: "power3.out" }
          );
        }
        if (heroCtaRef.current) {
          tl.fromTo(
            heroCtaRef.current,
            {  y: 24 },
            { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" },
            "-=0.4"
          );
        }
        if (heroImgRef.current) {
          tl.fromTo(
            heroImgRef.current,
            {  scale: 1.06, x: 30 },
            { opacity: 1, scale: 1, x: 0, duration: 1.1, ease: "power3.out" },
            "-=0.8"
          );
        }
        if (heroBadge1Ref.current) {
          tl.fromTo(
            heroBadge1Ref.current,
            {  y: 12 },
            { opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.4)" },
            "-=0.4"
          );
        }
        if (heroBadge2Ref.current) {
          tl.fromTo(
            heroBadge2Ref.current,
            {  y: -12 },
            { opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.4)" },
            "-=0.35"
          );
        }

        // Trust bar
        if (trustRef.current) {
          gsap.fromTo(
            trustRef.current.querySelectorAll(".trust-item"),
            {  y: 18 },
            {
              opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: "power2.out",
              scrollTrigger: { trigger: trustRef.current, start: "top 88%" },
            }
          );
        }

        // Stats count-up
        if (statsRef.current) {
          statNumRefs.current.forEach((el, i) => {
            if (!el) return;
            const target = t.stats[i]?.number || 0;
            const obj = { val: 0 };
            gsap.to(obj, {
              val: target,
              duration: 1.6,
              ease: "power2.out",
              snap: { val: 1 },
              onUpdate: () => { el.textContent = Math.round(obj.val) + (t.stats[i]?.suffix || ""); },
              scrollTrigger: { trigger: statsRef.current, start: "top 75%" },
            });
          });

          gsap.fromTo(
            statsRef.current.querySelectorAll(".stat-card"),
            {  y: 36 },
            {
              opacity: 1, y: 0, stagger: 0.12, duration: 0.8, ease: "power2.out",
              scrollTrigger: { trigger: statsRef.current, start: "top 78%" },
            }
          );
        }

        // About section
        if (aboutImgRef.current) {
          gsap.fromTo(
            aboutImgRef.current,
            {  x: isAr ? 40 : -40, scale: 1.04 },
            {
              opacity: 1, x: 0, scale: 1, duration: 1, ease: "power3.out",
              scrollTrigger: { trigger: aboutImgRef.current, start: "top 80%" },
            }
          );
        }
        if (aboutTextRef.current) {
          gsap.fromTo(
            aboutTextRef.current.children,
            {  y: 24 },
            {
              opacity: 1, y: 0, stagger: 0.1, duration: 0.7, ease: "power2.out",
              scrollTrigger: { trigger: aboutTextRef.current, start: "top 80%" },
            }
          );
        }

        // Generic scroll reveals
        document.querySelectorAll(".scroll-reveal").forEach((el) => {
          gsap.fromTo(
            el,
            {  y: 32 },
            {
              opacity: 1, y: 0, duration: 0.75, ease: "power2.out",
              scrollTrigger: { trigger: el, start: "top 85%" },
            }
          );
        });

        document.querySelectorAll(".scroll-reveal-stagger").forEach((el) => {
          gsap.fromTo(
            el.children,
            {  y: 28 },
            {
              opacity: 1, y: 0, stagger: 0.09, duration: 0.7, ease: "power2.out",
              scrollTrigger: { trigger: el, start: "top 83%" },
            }
          );
        });

      });
    };

    initGsap();
    return () => ctx?.revert();
  }, [locale]);

  // Scroll listener for nav
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Marquee duplicated items
  const marqueeItems = [...t.marquee, ...t.marquee, ...t.marquee];

  return (
    <div className="bg-stone-50 text-stone-900 font-body overflow-x-hidden">

      {/* ── STICKY NAV ────────────────────────────────────── */}
      <header
        ref={navRef}
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur-md border-b border-stone-100 shadow-sm" : "bg-transparent"}`}
      >
        <div className="max-w-7xl mx-auto px-5 lg:px-10 h-16 flex items-center justify-between gap-6">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2 shrink-0">
            <span className="w-7 h-7 bg-orange-600 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L2 13h10L7 1z" fill="white" />
              </svg>
            </span>
            <span className="font-display font-black text-lg tracking-tight text-stone-900">{t.nav.logo}</span>
            <span className="hidden sm:block text-xs font-body tracking-widest uppercase text-stone-400 mt-0.5">{t.nav.tagline}</span>
          </a>

          {/* Desktop links */}
          <nav className="hidden lg:flex items-center gap-7">
            {t.nav.links.map((l) => (
              <a key={l.href} href={l.href} className="text-sm font-body text-stone-600 hover:text-stone-900 transition-colors tracking-wide">
                {l.label}
              </a>
            ))}
          </nav>

          {/* Right group */}
          <div className="flex items-center gap-3">
            <a href={`/${isAr ? "en" : "ar"}`} className="hidden sm:block text-xs font-body font-semibold tracking-widest text-stone-500 hover:text-orange-600 transition-colors uppercase">
              {t.langSwitch}
            </a>
            <a href="#pricing" className="hidden sm:block text-sm font-body font-semibold bg-orange-600 text-white px-5 py-2.5 hover:bg-orange-700 transition-colors">
              {t.nav.cta}
            </a>
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden w-9 h-9 flex flex-col justify-center gap-1.5 items-end"
              aria-label="Open menu"
            >
              <span className="w-6 h-px bg-stone-900 block" />
              <span className="w-4 h-px bg-stone-900 block" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className={`relative ms-auto w-72 bg-white h-full flex flex-col p-8 pt-16 shadow-xl`}>
            <button onClick={() => setMobileOpen(false)} className="absolute top-5 end-5 w-8 h-8 flex items-center justify-center" aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="#111" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <div className="flex flex-col gap-6 mt-4">
              {t.nav.links.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="font-display text-xl font-bold text-stone-900 hover:text-orange-600">
                  {l.label}
                </a>
              ))}
            </div>
            <div className="mt-auto flex flex-col gap-3">
              <a href="#pricing" onClick={() => setMobileOpen(false)} className="block w-full text-center bg-orange-600 text-white font-body font-semibold py-3 text-sm">
                {t.nav.cta}
              </a>
              <a href={`/${isAr ? "en" : "ar"}`} className="block w-full text-center text-xs font-body font-semibold text-stone-500 tracking-widest uppercase">
                {t.langSwitch}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── HERO ──────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex items-end pb-16 pt-24 lg:pt-0 lg:items-center bg-stone-100 overflow-hidden">
        {/* Accent line */}
        <div className="absolute top-0 start-0 w-px h-full bg-stone-200 ms-16 hidden lg:block" />
        <div className="absolute top-32 end-0 w-32 h-32 border border-stone-200 me-10 hidden lg:block" />

        <div className="relative max-w-7xl mx-auto px-5 lg:px-10 w-full grid lg:grid-cols-2 gap-12 lg:gap-0 items-center">
          {/* Text side */}
          <div className="relative z-10">
            <div className="overflow-hidden mb-6">
              <p className="reveal-line text-xs font-body font-semibold tracking-[0.2em] uppercase text-orange-600 opacity-0">
                {t.hero.label}
              </p>
            </div>
            <div ref={heroHeadRef} className="mb-8">
              <div className="overflow-hidden">
                <h1 className="reveal-line font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black leading-[0.92] tracking-tight text-stone-900 opacity-0">
                  {t.hero.headline1}
                </h1>
              </div>
              <div className="overflow-hidden">
                <h1 className="reveal-line font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black leading-[0.92] tracking-tight text-orange-600 opacity-0">
                  {t.hero.headline2}
                </h1>
              </div>
              <div className="overflow-hidden">
                <h1 className="reveal-line font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black leading-[0.92] tracking-tight text-stone-900 opacity-0">
                  {t.hero.headline3}
                </h1>
              </div>
            </div>
            <div ref={heroCtaRef} className="opacity-0">
              <p className="font-body text-stone-500 text-base leading-relaxed max-w-sm mb-8">
                {t.hero.sub}
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="#pricing" className="inline-block bg-orange-600 text-white font-body font-semibold text-sm px-8 py-4 hover:bg-orange-700 transition-colors">
                  {t.hero.cta1}
                </a>
                <a href="#results" className="inline-flex items-center gap-2 font-body font-semibold text-sm text-stone-900 px-6 py-4 border border-stone-300 hover:border-stone-900 transition-colors">
                  {t.hero.cta2}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="rtl:-scale-x-100">
                    <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>
            </div>
            {/* Badge 1 */}
            <div ref={heroBadge1Ref} className="absolute -bottom-4 start-0 lg:bottom-auto lg:top-12 lg:-start-6 opacity-0 hidden lg:block">
              <div className="bg-white border border-stone-200 px-4 py-3 shadow-sm">
                <p className="font-display text-2xl font-black text-stone-900 leading-none">{t.hero.badge1.split(" ")[0]}</p>
                <p className="font-body text-xs text-stone-500 tracking-wide mt-0.5">{t.hero.badge1.split(" ").slice(1).join(" ")}</p>
              </div>
            </div>
          </div>

          {/* Image side */}
          <div className="relative lg:absolute lg:inset-y-0 lg:end-0 lg:w-1/2 h-72 sm:h-96 lg:h-full overflow-hidden opacity-0" ref={heroImgRef}>
            <img
              src={images.coachHero}
              alt={t.hero.imageAlt}
              className="w-full h-full object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-s from-stone-100/60 via-transparent lg:bg-gradient-to-e lg:from-stone-100/80 lg:via-stone-100/20 lg:to-transparent" />
            {/* Badge 2 */}
            <div ref={heroBadge2Ref} className="absolute bottom-6 end-6 opacity-0 bg-orange-600 text-white px-4 py-3">
              <p className="font-display text-2xl font-black leading-none">{t.hero.badge2.split(" ")[0]}</p>
              <p className="font-body text-xs tracking-wide mt-0.5">{t.hero.badge2.split(" ").slice(1).join(" ")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ─────────────────────────────────────── */}
      <section ref={trustRef} className="bg-white border-y border-stone-200">
        <div className="max-w-7xl mx-auto px-5 lg:px-10 py-6">
          <div className="flex flex-wrap justify-between gap-6">
            {t.trust.map((item, i) => (
              <div key={i} className="trust-item flex flex-col items-center opacity-0">
                <span className="font-display font-black text-xl text-stone-900">{item.value}</span>
                <span className="font-body text-xs text-stone-400 tracking-wide mt-0.5 text-center">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MARQUEE ───────────────────────────────────────── */}
      <section className="py-5 bg-stone-900 overflow-hidden">
        <div ref={marqueeRef} className="flex gap-10 w-max animate-[marquee_28s_linear_infinite]">
          {marqueeItems.map((item, i) => (
            <span key={i} className="font-body text-xs font-semibold tracking-[0.18em] uppercase text-stone-400 whitespace-nowrap flex items-center gap-10">
              {item}
              <span className="w-1 h-1 rounded-full bg-orange-600 inline-block" />
            </span>
          ))}
        </div>
        <style>{`@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-33.333%)}}`}</style>
      </section>

      {/* ── STATS ─────────────────────────────────────────── */}
      <section ref={statsRef} className="py-24 lg:py-32 bg-stone-50">
        <div className="max-w-7xl mx-auto px-5 lg:px-10">
          <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-orange-600 mb-16 scroll-reveal opacity-0">Numbers</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-stone-200">
            {t.stats.map((s, i) => (
              <div key={i} className="stat-card bg-stone-50 p-8 lg:p-12 opacity-0">
                <p
                  ref={(el) => (statNumRefs.current[i] = el)}
                  className="font-display font-black text-5xl lg:text-7xl text-stone-900 leading-none"
                >
                  0{s.suffix}
                </p>
                <p className="font-body text-sm text-stone-400 tracking-wide mt-3">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ─────────────────────────────────────────── */}
      <section id="about" className="py-24 lg:py-32 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 lg:px-10 grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <div ref={aboutImgRef} className="relative opacity-0">
            <div className="aspect-[3/4] overflow-hidden">
              <img src={images.coachAbout} alt={t.about.imageAlt} className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-6 -end-6 bg-orange-600 text-white p-6 hidden lg:block">
              <p className="font-display font-black text-3xl leading-none">8+</p>
              <p className="font-body text-xs tracking-wide mt-1">Years</p>
            </div>
          </div>
          <div ref={aboutTextRef}>
            <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-orange-600 mb-4">{t.about.label}</p>
            <h2 className="font-display font-black text-4xl lg:text-5xl text-stone-900 leading-tight mb-2">{t.about.name}</h2>
            <p className="font-body text-sm text-stone-400 tracking-wide mb-8">{t.about.title}</p>
            <p className="font-body text-stone-600 text-base leading-relaxed mb-8">{t.about.story}</p>
            <blockquote className="border-s-2 border-orange-600 ps-5 mb-8">
              <p className="font-body text-stone-700 text-base italic leading-relaxed">{t.about.philosophy}</p>
            </blockquote>
            <div className="flex flex-wrap gap-2">
              {t.about.tags.map((tag) => (
                <span key={tag} className="text-xs font-body font-semibold tracking-widest uppercase border border-stone-200 px-3 py-1.5 text-stone-600">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE ────────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-stone-900 text-white">
        <div className="max-w-7xl mx-auto px-5 lg:px-10">
          <div className="grid lg:grid-cols-[1fr_2fr] gap-16 items-start">
            <div className="scroll-reveal opacity-0">
              <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-orange-500 mb-4">{t.why.label}</p>
              <h2 className="font-display font-black text-4xl lg:text-5xl leading-tight">{t.why.headline}</h2>
            </div>
            <div className="scroll-reveal-stagger grid sm:grid-cols-2 gap-px bg-stone-700">
              {t.why.items.map((item, i) => (
                <div key={i} className="bg-stone-900 p-7">
                  <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-stone-500 mb-3">0{i + 1}</p>
                  <h3 className="font-display font-bold text-lg text-white mb-2">{item.title}</h3>
                  <p className="font-body text-sm text-stone-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── WHO THIS IS FOR ───────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-stone-50">
        <div className="max-w-7xl mx-auto px-5 lg:px-10">
          <div className="mb-14 scroll-reveal opacity-0">
            <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-orange-600 mb-4">{t.forWho.label}</p>
            <h2 className="font-display font-black text-4xl lg:text-5xl text-stone-900 leading-tight max-w-xl">{t.forWho.headline}</h2>
          </div>
          <div className="scroll-reveal-stagger grid grid-cols-2 sm:grid-cols-4 gap-px bg-stone-200">
            {t.forWho.items.map((item, i) => (
              <div key={i} className="bg-stone-50 p-6 hover:bg-white transition-colors duration-200 group">
                <h3 className="font-display font-bold text-base text-stone-900 group-hover:text-orange-600 transition-colors mb-2">{item.title}</h3>
                <p className="font-body text-xs text-stone-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── METHOD / HOW IT WORKS ─────────────────────────── */}
      <section id="method" className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-5 lg:px-10">
          <div className="mb-16 scroll-reveal opacity-0">
            <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-orange-600 mb-4">{t.method.label}</p>
            <h2 className="font-display font-black text-4xl lg:text-5xl text-stone-900 leading-tight max-w-xl">{t.method.headline}</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-stone-200 scroll-reveal-stagger">
            {t.method.steps.map((step) => (
              <div key={step.num} className="bg-white p-8 lg:p-10 group hover:bg-stone-50 transition-colors">
                <p className="font-display font-black text-5xl text-stone-100 group-hover:text-orange-100 transition-colors mb-6 leading-none">{step.num}</p>
                <h3 className="font-display font-bold text-lg text-stone-900 mb-3">{step.title}</h3>
                <p className="font-body text-sm text-stone-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES ──────────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-stone-100">
        <div className="max-w-7xl mx-auto px-5 lg:px-10">
          <div className="mb-16 scroll-reveal opacity-0">
            <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-orange-600 mb-4">{t.services.label}</p>
            <h2 className="font-display font-black text-4xl lg:text-5xl text-stone-900 leading-tight">{t.services.headline}</h2>
          </div>

          {/* Bento-style offset layout */}
          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
            {/* Service 01 — large */}
            <div className="relative group overflow-hidden bg-stone-900 text-white flex flex-col scroll-reveal opacity-0">
              <div className="h-64 lg:h-80 overflow-hidden">
                <img src={images.service1} alt={t.services.items[0].imageAlt} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700 ease-out" />
              </div>
              <div className="p-8 flex-1 flex flex-col">
                <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-stone-400 mb-2">{t.services.items[0].num} — {t.services.items[0].sub}</p>
                <h3 className="font-display font-black text-3xl mb-3">{t.services.items[0].title}</h3>
                <p className="font-body text-sm text-stone-300 leading-relaxed flex-1">{t.services.items[0].desc}</p>
                <a href="#pricing" className="mt-6 inline-flex items-center gap-2 text-sm font-body font-semibold text-orange-500 hover:text-orange-400 transition-colors">
                  {t.services.items[0].cta}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="rtl:-scale-x-100">
                    <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Services 02 + 03 stacked */}
            <div className="flex flex-col gap-5">
              {[1, 2].map((idx) => (
                <div key={idx} className="relative group overflow-hidden bg-white border border-stone-200 flex flex-col scroll-reveal opacity-0" style={{ transitionDelay: `${idx * 100}ms` }}>
                  <div className="h-44 overflow-hidden">
                    <img src={idx === 1 ? images.service2 : images.service3} alt={t.services.items[idx].imageAlt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                  </div>
                  <div className="p-6">
                    <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-stone-400 mb-1">{t.services.items[idx].num} — {t.services.items[idx].sub}</p>
                    <h3 className="font-display font-bold text-xl text-stone-900 mb-2">{t.services.items[idx].title}</h3>
                    <p className="font-body text-sm text-stone-500 leading-relaxed mb-4">{t.services.items[idx].desc}</p>
                    <a href="#pricing" className="inline-flex items-center gap-2 text-xs font-body font-semibold text-stone-900 hover:text-orange-600 transition-colors">
                      {t.services.items[idx].cta}
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="rtl:-scale-x-100">
                        <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURED TRANSFORMATION ───────────────────────── */}
      <section id="results" className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-5 lg:px-10">
          <div className="mb-12 scroll-reveal opacity-0">
            <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-orange-600 mb-4">{t.featured.label}</p>
            <h2 className="font-display font-black text-4xl lg:text-6xl text-stone-900 leading-tight max-w-2xl">{t.featured.headline}</h2>
          </div>
          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-16 items-start scroll-reveal opacity-0">
            {/* Slider */}
            <div className="aspect-[4/5] overflow-hidden">
              <BeforeAfterSlider
                beforeImg={images.featuredBefore}
                afterImg={images.featuredAfter}
                beforeAlt={t.featured.beforeAlt}
                afterAlt={t.featured.afterAlt}
                beforeLabel={t.featured.beforeLabel}
                afterLabel={t.featured.afterLabel}
              />
            </div>
            {/* Story */}
            <div className="flex flex-col justify-center">
              <p className="font-display font-bold text-xl text-stone-900 mb-4">{t.featured.client}</p>
              <p className="font-body text-stone-500 text-base leading-relaxed mb-10">{t.featured.story}</p>
              <div className="grid grid-cols-2 gap-px bg-stone-200">
                {t.featured.stats.map((s, i) => (
                  <div key={i} className="bg-white p-5">
                    <p className="font-display font-black text-2xl text-orange-600 leading-none">{s.value}</p>
                    <p className="font-body text-xs text-stone-400 tracking-wide mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── GALLERY ───────────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-stone-50">
        <div className="max-w-7xl mx-auto px-5 lg:px-10">
          <div className="mb-14 scroll-reveal opacity-0">
            <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-orange-600 mb-4">{t.gallery.label}</p>
            <h2 className="font-display font-black text-4xl lg:text-5xl text-stone-900 leading-tight">{t.gallery.headline}</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 scroll-reveal-stagger">
            {t.gallery.clients.map((client, i) => (
              <div key={i} className="bg-white overflow-hidden border border-stone-100 group">
                <div className="aspect-[3/4] overflow-hidden">
                  <BeforeAfterSlider
                    beforeImg={client.beforeImg}
                    afterImg={client.afterImg}
                    beforeAlt={client.beforeAlt}
                    afterAlt={client.afterAlt}
                    beforeLabel={t.gallery.beforeLabel}
                    afterLabel={t.gallery.afterLabel}
                  />
                </div>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-display font-bold text-base text-stone-900">{client.name}</p>
                      <p className="font-body text-xs text-stone-400">{client.duration} · {client.goal}</p>
                    </div>
                    <span className="text-xs font-body font-semibold tracking-widest uppercase border border-orange-200 text-orange-600 px-2 py-1">{client.goal}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {client.stats.map((s, j) => (
                      <span key={j} className="text-xs font-body text-stone-600 bg-stone-100 px-2 py-1">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-5 lg:px-10">
          <div className="mb-14 scroll-reveal opacity-0">
            <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-orange-600 mb-4">{t.testimonials.label}</p>
            <h2 className="font-display font-black text-4xl lg:text-5xl text-stone-900 leading-tight">{t.testimonials.headline}</h2>
          </div>

          {/* Masonry-like layout */}
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 scroll-reveal-stagger">
            {t.testimonials.items.map((item, i) => (
              <div key={i} className={`break-inside-avoid mb-5 bg-stone-50 border border-stone-100 p-7 ${i === 2 ? "lg:mt-10" : ""}`}>
                <div className="flex items-center gap-3 mb-5">
                  <img src={item.img} alt={item.name} className="w-10 h-10 object-cover rounded-none grayscale" />
                  <div>
                    <p className="font-display font-bold text-sm text-stone-900">{item.name}</p>
                    <p className="font-body text-xs text-stone-400">{item.detail}</p>
                  </div>
                </div>
                <p className="font-body text-stone-600 text-sm leading-relaxed">&ldquo;{item.text}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RESOURCES ─────────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-stone-100">
        <div className="max-w-7xl mx-auto px-5 lg:px-10">
          <div className="grid lg:grid-cols-[1fr_2fr] gap-16 items-start scroll-reveal opacity-0">
            <div>
              <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-orange-600 mb-4">{t.resources.label}</p>
              <h2 className="font-display font-black text-4xl lg:text-5xl text-stone-900 leading-tight">{t.resources.headline}</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-px bg-stone-200">
              {t.resources.items.map((item, i) => (
                <div key={i} className="bg-stone-100 p-7 hover:bg-white transition-colors duration-200">
                  <span className="text-2xl mb-4 block" role="img">{item.icon}</span>
                  <h3 className="font-display font-bold text-base text-stone-900 mb-2">{item.title}</h3>
                  <p className="font-body text-sm text-stone-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────── */}
      <section id="pricing" className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-5 lg:px-10">
          <div className="mb-14 scroll-reveal opacity-0">
            <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-orange-600 mb-4">{t.pricing.label}</p>
            <h2 className="font-display font-black text-4xl lg:text-5xl text-stone-900 leading-tight">{t.pricing.headline}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5 scroll-reveal-stagger">
            {t.pricing.tiers.map((tier) => (
              <div
                key={tier.name}
                className={`flex flex-col p-8 ${tier.featured ? "bg-stone-900 text-white ring-2 ring-orange-600" : "bg-stone-50 border border-stone-200 text-stone-900"}`}
              >
                {tier.featured && (
                  <span className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-orange-500 mb-4">Most Popular</span>
                )}
                <p className={`font-display font-black text-xl mb-1 ${tier.featured ? "text-white" : "text-stone-900"}`}>{tier.name}</p>
                <p className={`font-body text-sm mb-6 ${tier.featured ? "text-stone-400" : "text-stone-500"}`}>{tier.desc}</p>
                <div className="flex items-end gap-1 mb-8">
                  <span className="font-display font-black text-5xl leading-none">{tier.price}</span>
                  <span className={`font-body text-sm pb-1 ${tier.featured ? "text-stone-400" : "text-stone-400"}`}>{tier.period}</span>
                </div>
                <ul className="flex flex-col gap-3 flex-1 mb-8">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <span className="mt-0.5 w-4 h-4 shrink-0 flex items-center justify-center">
                        <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                          <path d="M1 4l3.5 3.5L11 1" stroke={tier.featured ? "#ea580c" : "#111"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span className={`font-body text-sm leading-snug ${tier.featured ? "text-stone-300" : "text-stone-600"}`}>{f}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#"
                  className={`block text-center text-sm font-body font-semibold py-4 transition-colors ${tier.featured ? "bg-orange-600 text-white hover:bg-orange-700" : "border border-stone-300 text-stone-900 hover:border-stone-900"}`}
                >
                  {tier.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────── */}
      <section id="faq" className="py-24 lg:py-32 bg-stone-50">
        <div className="max-w-7xl mx-auto px-5 lg:px-10">
          <div className="grid lg:grid-cols-[1fr_2fr] gap-16">
            <div className="scroll-reveal opacity-0">
              <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-orange-600 mb-4">{t.faq.label}</p>
              <h2 className="font-display font-black text-4xl lg:text-5xl text-stone-900 leading-tight">{t.faq.headline}</h2>
            </div>
            <div className="scroll-reveal opacity-0">
              {t.faq.items.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────── */}
      <section className="py-24 lg:py-36 bg-stone-900 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 start-0 w-96 h-96 border border-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 end-0 w-64 h-64 border border-white rounded-full translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="relative max-w-3xl mx-auto px-5 scroll-reveal opacity-0">
          <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-orange-500 mb-6">{t.cta.label}</p>
          <h2 className="font-display font-black text-5xl lg:text-7xl leading-tight mb-8">{t.cta.headline}</h2>
          <p className="font-body text-stone-400 text-base mb-10">{t.cta.sub}</p>
          <a href="#" className="inline-block bg-orange-600 text-white font-body font-semibold text-sm px-10 py-5 hover:bg-orange-700 transition-colors mb-5">
            {t.cta.button}
          </a>
          <p className="font-body text-xs text-stone-500">{t.cta.trust}</p>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer className="bg-black text-white py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-5 lg:px-10">
          <div className="grid lg:grid-cols-[1.5fr_1fr_1fr_1fr] gap-10 mb-16">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-7 h-7 bg-orange-600 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1L2 13h10L7 1z" fill="white" />
                  </svg>
                </span>
                <span className="font-display font-black text-lg">{t.nav.logo}</span>
              </div>
              <p className="font-body text-sm text-stone-400 mb-6 max-w-xs">{t.footer.tagline}</p>
              <div className="flex gap-4">
                {t.footer.social.map((s) => (
                  <a key={s} href="#" className="font-body text-xs text-stone-500 hover:text-orange-500 transition-colors">{s}</a>
                ))}
              </div>
            </div>
            {/* Nav groups */}
            {t.footer.navGroups.map((group) => (
              <div key={group.title}>
                <p className="font-body text-xs font-semibold tracking-[0.18em] uppercase text-stone-500 mb-5">{group.title}</p>
                <ul className="flex flex-col gap-3">
                  {group.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="font-body text-sm text-stone-400 hover:text-white transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-stone-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="font-body text-xs text-stone-600">{t.footer.copy}</p>
            <a href={`/${isAr ? "en" : "ar"}`} className="font-body text-xs font-semibold tracking-widest uppercase text-stone-500 hover:text-orange-500 transition-colors">
              {t.langSwitch}
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}

/*
 * ============================================================
 * CONTENT OBJECT SHAPE (for reference):
 *
 * content.en / content.ar = {
 *   nav:          { logo, tagline, links: [{label, href}], cta }
 *   hero:         { label, headline1-3, highlighted, sub, cta1, cta2, badge1-2, imageAlt }
 *   trust:        [ { value, label } ]
 *   marquee:      [ string ]
 *   stats:        [ { number, suffix, label } ]
 *   about:        { label, name, title, story, philosophy, tags, imageAlt }
 *   why:          { label, headline, items: [{title, desc}] }
 *   forWho:       { label, headline, items: [{title, desc}] }
 *   method:       { label, headline, steps: [{num, title, desc}] }
 *   services:     { label, headline, items: [{num, title, sub, desc, cta, imageAlt}] }
 *   featured:     { label, headline, client, story, stats: [{value, label}], beforeLabel, afterLabel, beforeAlt, afterAlt }
 *   gallery:      { label, headline, beforeLabel, afterLabel, clients: [{name, duration, goal, stats, beforeAlt, afterAlt, beforeImg, afterImg}] }
 *   testimonials: { label, headline, items: [{name, detail, text, img}] }
 *   resources:    { label, headline, items: [{icon, title, desc}] }
 *   pricing:      { label, headline, tiers: [{name, price, period, desc, features, cta, featured}] }
 *   faq:          { label, headline, items: [{q, a}] }
 *   cta:          { label, headline, sub, button, trust }
 *   footer:       { tagline, navGroups: [{title, links}], copy, social }
 *   lang:         string
 *   langSwitch:   string
 * }
 *
 * images = {
 *   coachHero, coachAbout,
 *   service1, service2, service3,
 *   featuredBefore, featuredAfter,
 *   before1..6, after1..6,
 *   testimonial1..5
 * }
 * ============================================================
 */