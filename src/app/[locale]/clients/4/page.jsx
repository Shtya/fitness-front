/*

 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ─── CENTRALIZED IMAGE REGISTRY ───────────────────────────────────────────────
const images = {
  // Hero — woman training hard, dramatic gym lighting
  hero:         'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=1600&q=90&fit=crop',
  // Coach — athletic woman in gym, confident pose
  coach:        'https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=900&q=85&fit=crop',
  // Before/After pairs — women's body transformation
  before1:      'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=85&fit=crop',
  after1:       'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=85&fit=crop',
  before2:      'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=600&q=85&fit=crop',
  after2:       'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=600&q=85&fit=crop',
  before3:      'https://images.unsplash.com/photo-1530822847156-5df684ec5933?w=600&q=85&fit=crop',
  after3:       'https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=600&q=85&fit=crop',
  // Testimonials — women's close-up portraits
  testimonial1: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&q=80&fit=crop&crop=face',
  testimonial2: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&q=80&fit=crop&crop=face',
  testimonial3: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80&fit=crop&crop=face',
  // Resources — women gym workout shots
  resource1:    'https://images.unsplash.com/photo-1581009137042-c552e485697a?w=700&q=80&fit=crop',
  resource2:    'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=700&q=80&fit=crop',
  // Featured full-width — woman lifting, strong & athletic
   featured: {
    before: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=85&fit=crop",
    after: "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=800&q=85&fit=crop",
  },
  testimonials: [
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&q=80&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&q=80&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&q=80&fit=crop&crop=face",
  ], 
  resource3: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&q=80&fit=crop",
};

 
// ─── LOCALIZED CONTENT ────────────────────────────────────────────────────────
const content = {
  en: {
    nav: {
      logo: "KARIM COACH",
      links: ["About", "Method", "Programs", "Transformations", "FAQ"],
      cta: "Book a Call",
    },
    hero: {
      eyebrow: "Elite Personal Training",
      headline: ["Transform", "Your Body.", "Rewire", "Your Habits."],
      sub: "Science-backed coaching for people who are serious about change. No templates. No shortcuts. Just results.",
      cta: "Start Your Transformation",
      ctaSub: "Limited spots available",
      scrollLabel: "Scroll",
    },
    trust: {
      label: "As featured in",
      brands: ["Men's Health", "GQ Fitness", "Athletic Weekly", "FitLife Magazine", "Arab Health Summit"],
    },
    marquee: [
      "Elite Coaching",
      "Proven Method",
      "Custom Nutrition",
      "12-Week Programs",
      "Real Results",
      "Science-Based",
      "No Gimmicks",
      "100+ Transformations",
    ],
    stats: [
      { value: "340+", label: "Clients Transformed" },
      { value: "8 Yrs", label: "Professional Experience" },
      { value: "92%", label: "Client Retention Rate" },
      { value: "#1", label: "Ranked Coach, MENA" },
    ],
    about: {
      eyebrow: "The Coach",
      name: "Karim Haddad",
      title: "CSCS · PN1 Certified · Ex-Pro Athlete",
      bio1: "I spent three years overtraining and under-recovering before I figured out what actually works. Now I help driven people build bodies that perform as good as they look — sustainably, without wrecking their lives in the process.",
      bio2: "My approach is built on movement science, real nutrition, and relentless personalization. No cookie-cutter programs. Just a system designed around you.",
      cta: "My Full Story →",
      badges: ["CSCS Certified", "PN Level 1", "NASM-PES", "Former Pro Athlete"],
    },
    why: {
      eyebrow: "Why Work With Me",
      headline: "Different by design.",
      items: [
        {
          num: "01",
          title: "Built Around You",
          body: "Every program starts with a deep-dive assessment. Your history, your goals, your constraints. Nothing is generic.",
        },
        {
          num: "02",
          title: "Science, Not Hype",
          body: "No fat-burning wraps. No 30-day miracle programs. Evidence-based methods that have stood up to peer review.",
        },
        {
          num: "03",
          title: "Accountability That Works",
          body: "Weekly check-ins, form reviews, and direct messaging access. You will not fall through the cracks.",
        },
        {
          num: "04",
          title: "Lifestyle Integration",
          body: "Training that fits real life. Travel weeks, Ramadan, family events — the plan adapts so you don't have to start over.",
        },
      ],
    },
    whoFor: {
      eyebrow: "Who This Is For",
      headline: "Not for everyone. Built for the right ones.",
      body: "This coaching isn't for people looking for a quick fix. It's for professionals, athletes, and driven individuals who want a sustainable system they can own for life.",
      profiles: [
        "Busy professionals with 45–60 min/day to train",
        "Former athletes wanting to reclaim their best shape",
        "People who've tried programs and kept hitting plateaus",
        "Anyone ready to stop guessing and start following a real plan",
      ],
      notFor: "Not for: people looking for a magic pill or a 7-day detox.",
    },
    method: {
      eyebrow: "The Method",
      headline: "A system, not a sprint.",
      steps: [
        { num: "01", title: "Deep Assessment", body: "Movement screen, lifestyle audit, metabolic history. We build the baseline before we build anything else." },
        { num: "02", title: "Custom Blueprint", body: "Your personal training and nutrition plan, written from scratch based on your assessment results and goals." },
        { num: "03", title: "Progressive Execution", body: "Structured weekly programming that evolves with you. Every 4 weeks, the plan is reassessed and refined." },
        { num: "04", title: "Sustained Performance", body: "You don't just hit your goal — you build the habits to stay there. This is where most programs stop. We don't." },
      ],
    },
    services: {
      eyebrow: "Programs",
      headline: "Pick your track.",
      items: [
        {
          tag: "Most Popular",
          name: "12-Week Transformation",
          desc: "Full custom training + nutrition + weekly coaching. The complete system for measurable results.",
          features: ["Custom training plan", "Personalized nutrition", "Weekly video check-ins", "WhatsApp access", "Form review videos"],
          price: "$650",
          period: "/ program",
          cta: "Apply Now",
        },
        {
          tag: "Ongoing",
          name: "Monthly Coaching",
          desc: "For clients past the initial phase who want structured accountability and refinement.",
          features: ["Monthly plan updates", "2 check-in calls/month", "Nutrition adjustments", "Priority messaging"],
          price: "$250",
          period: "/ month",
          cta: "Apply Now",
        },
        {
          tag: "Self-Paced",
          name: "Program Only",
          desc: "A standalone written program designed for your level and equipment. No coaching calls included.",
          features: ["Full written program", "Nutrition guide", "Video exercise library", "One revision round"],
          price: "$120",
          period: "/ program",
          cta: "Get the Program",
        },
      ],
    },
    featured: {
      eyebrow: "Featured Transformation",
      name: "Ahmed, 34 — Dubai",
      result: "−22kg in 14 weeks",
      quote: "I'd tried three different trainers before Karim. This is the first time I actually understood what I was doing and why. The results speak for themselves.",
    },
    gallery: {
      eyebrow: "Transformations",
      headline: "Real clients. Real results.",
      beforeLabel: "Before",
      afterLabel: "After",
      pairs: [
        { name: "Ahmed R.", duration: "14 weeks", result: "−22kg" },
        { name: "Sara M.", duration: "12 weeks", result: "−14kg" },
        { name: "Faisal K.", duration: "16 weeks", result: "−18kg" },
      ],
    },
    testimonials: {
      eyebrow: "Client Words",
      headline: "What they say after the work is done.",
      items: [
        {
          name: "Ahmed Rashid",
          handle: "Dubai, UAE",
          stars: 5,
          text: "I came in skeptical. I left down 22 kilos and with a completely different relationship to food and training. Karim is the real deal.",
        },
        {
          name: "Sara Mansour",
          handle: "Cairo, Egypt",
          stars: 5,
          text: "The plan fit my life. Travel, Ramadan, family events — nothing derailed me because the program was built for the real world.",
        },
        {
          name: "James Harley",
          handle: "London, UK",
          stars: 5,
          text: "Three years of trying to get lean on my own. Twelve weeks with Karim and I finally understood what I was doing wrong.",
        },
        {
          name: "Noura Al Hamad",
          handle: "Riyadh, KSA",
          stars: 5,
          text: "Best investment I've made in myself. Period. The accountability and structure changed everything for me.",
        },
      ],
    },
    resources: {
      eyebrow: "Free Resources",
      headline: "Take something with you.",
      items: [
        { tag: "Guide", title: "The 90-Day Fat Loss Playbook", desc: "A no-nonsense framework for sustainable fat loss — no calorie obsession required." },
        { tag: "Video", title: "The 5 Training Mistakes Killing Your Progress", desc: "The errors I see in 80% of self-coached athletes. Fix these first." },
        { tag: "Template", title: "Weekly Meal Prep Template", desc: "The exact meal prep structure I use with my clients who travel constantly." },
      ],
    },
    pricing: {
      eyebrow: "Investment",
      headline: "Simple pricing. Zero surprises.",
      note: "All programs include a free 20-minute discovery call before commitment.",
    },
    faq: {
      eyebrow: "FAQ",
      headline: "Questions answered.",
      items: [
        { q: "Do I need a gym membership?", a: "Not necessarily. Programs can be designed for gym, home, or travel. We'll assess your setup in the initial call." },
        { q: "How do check-ins work?", a: "Weekly video or voice check-ins via WhatsApp or Zoom, depending on your preference. Plus async messaging access throughout the week." },
        { q: "What if I have an injury or limitation?", a: "All programs are adapted to your current physical state. I'll review your history and design around it, not against it." },
        { q: "How quickly will I see results?", a: "Most clients see measurable changes in 3–4 weeks. Significant body composition shifts typically emerge at 8–10 weeks." },
        { q: "Is this for weight loss only?", a: "No. Muscle gain, athletic performance, post-rehab return to sport, and general health optimization are all within scope." },
        { q: "What languages do you coach in?", a: "English and Arabic. The programs and check-ins are available in both." },
      ],
    },
    finalCta: {
      headline: "The next version of you starts with one decision.",
      sub: "Limited spots open each month. Apply now to secure your discovery call.",
      cta: "Apply for Coaching",
      note: "Free 20-min discovery call · No commitment required",
    },
    footer: {
      tagline: "Elite fitness coaching for people who mean it.",
      links: ["Privacy Policy", "Terms", "Contact"],
      copy: "© 2025 Karim Haddad Coaching. All rights reserved.",
    },
  },

  ar: {
    nav: {
      logo: "كريم كوتش",
      links: ["عني", "المنهج", "البرامج", "التحولات", "الأسئلة"],
      cta: "احجز استشارة",
    },
    hero: {
      eyebrow: "تدريب شخصي احترافي",
      headline: ["حوّل", "جسدك.", "أعد", "بناء عاداتك."],
      sub: "تدريب مبني على العلم لمن يريد تغييراً حقيقياً. لا برامج جاهزة. لا اختصارات. فقط نتائج.",
      cta: "ابدأ رحلة التحول",
      ctaSub: "أماكن محدودة",
      scrollLabel: "اكتشف",
    },
    trust: {
      label: "كما ظهرنا في",
      brands: ["مجلة الصحة", "GQ فيتنس", "Athletic Weekly", "FitLife", "قمة الصحة العربية"],
    },
    marquee: [
      "تدريب احترافي",
      "منهج مُثبت",
      "تغذية مخصصة",
      "برامج 12 أسبوع",
      "نتائج حقيقية",
      "قائم على العلم",
      "بلا وعود زائفة",
      "+100 تحول",
    ],
    stats: [
      { value: "+340", label: "عميل تحوّل" },
      { value: "8 سنوات", label: "خبرة احترافية" },
      { value: "٪92", label: "نسبة الاحتفاظ بالعملاء" },
      { value: "#1", label: "مدرب مصنّف في المنطقة" },
    ],
    about: {
      eyebrow: "المدرب",
      name: "كريم حداد",
      title: "CSCS · PN1 معتمد · رياضي محترف سابق",
      bio1: "قضيت ثلاث سنوات في التدريب المفرط وضعف التعافي قبل أن أكتشف ما يجدي حقاً. الآن أساعد الأشخاص الطموحين على بناء أجسام تؤدي بنفس قدر ما تبدو عليه — باستدامة وبدون إهدار حياتهم في العملية.",
      bio2: "نهجي مبني على علم الحركة والتغذية الحقيقية والتخصيص الكامل. لا برامج جاهزة. فقط نظام مصمم حولك.",
      cta: "قصتي كاملة ←",
      badges: ["معتمد CSCS", "PN المستوى 1", "NASM-PES", "رياضي محترف سابق"],
    },
    why: {
      eyebrow: "لماذا أنا",
      headline: "مختلف بالتصميم.",
      items: [
        { num: "01", title: "مبني حولك", body: "كل برنامج يبدأ بتقييم عميق. تاريخك، أهدافك، قيودك. لا شيء جاهز." },
        { num: "02", title: "علم لا ضجيج", body: "لا ملفوفات حرق الدهون. لا برامج معجزة. طرق قائمة على الأدلة صمدت أمام التقييم العلمي." },
        { num: "03", title: "محاسبة حقيقية", body: "متابعات أسبوعية ومراجعة للأداء وتواصل مباشر. لن تقع في فراغ." },
        { num: "04", title: "تكامل مع الحياة", body: "تدريب يناسب الحياة الحقيقية. أسابيع السفر، رمضان، مناسبات العائلة — الخطة تتكيف." },
      ],
    },
    whoFor: {
      eyebrow: "لمن هذا",
      headline: "ليس للجميع. مبني للمناسبين.",
      body: "هذا التدريب ليس لمن يبحث عن حل سريع. إنه للمحترفين والرياضيين والأشخاص الطموحين الذين يريدون نظاماً مستداماً يمتلكونه مدى الحياة.",
      profiles: [
        "محترفون مشغولون لديهم 45-60 دقيقة يومياً للتدريب",
        "رياضيون سابقون يريدون استعادة أفضل حالاتهم",
        "أشخاص جربوا برامج عديدة ووصلوا لنقطة الثبات",
        "من هم مستعدون للتوقف عن التخمين واتباع خطة حقيقية",
      ],
      notFor: "ليس لـ: من يبحث عن حبة سحرية أو ديتوكس 7 أيام.",
    },
    method: {
      eyebrow: "المنهج",
      headline: "نظام، ليس سباقاً.",
      steps: [
        { num: "01", title: "تقييم عميق", body: "فحص الحركة، مراجعة نمط الحياة، التاريخ الأيضي. نبني الأساس قبل أي شيء آخر." },
        { num: "02", title: "مخطط مخصص", body: "خطة تدريبك وتغذيتك الشخصية، مكتوبة من الصفر بناءً على نتائج التقييم وأهدافك." },
        { num: "03", title: "تنفيذ تدريجي", body: "برمجة أسبوعية منظمة تتطور معك. كل 4 أسابيع، تُعاد مراجعة الخطة وتحسينها." },
        { num: "04", title: "أداء مستدام", body: "لا تصل فقط لهدفك — تبني العادات للبقاء هناك. هنا تتوقف معظم البرامج. نحن لا نتوقف." },
      ],
    },
    services: {
      eyebrow: "البرامج",
      headline: "اختر مسارك.",
      items: [
        {
          tag: "الأكثر طلباً",
          name: "تحول 12 أسبوع",
          desc: "تدريب + تغذية + تدريب أسبوعي كامل مخصص. النظام الكامل لنتائج قابلة للقياس.",
          features: ["خطة تدريب مخصصة", "تغذية شخصية", "متابعات فيديو أسبوعية", "وصول واتساب", "مراجعة فيديوهات الأداء"],
          price: "650$",
          period: "/ البرنامج",
          cta: "قدّم الآن",
        },
        {
          tag: "مستمر",
          name: "تدريب شهري",
          desc: "للعملاء الذين تجاوزوا المرحلة الأولى ويريدون محاسبة منظمة وتطويراً.",
          features: ["تحديثات شهرية للخطة", "مكالمتا متابعة/شهر", "تعديلات التغذية", "رسائل أولوية"],
          price: "250$",
          period: "/ شهر",
          cta: "قدّم الآن",
        },
        {
          tag: "ذاتي",
          name: "برنامج فقط",
          desc: "برنامج مكتوب مستقل مصمم لمستواك وأدواتك. بدون جلسات تدريب.",
          features: ["برنامج مكتوب كامل", "دليل التغذية", "مكتبة فيديوهات التمارين", "جولة مراجعة واحدة"],
          price: "120$",
          period: "/ البرنامج",
          cta: "احصل على البرنامج",
        },
      ],
    },
    featured: {
      eyebrow: "تحول مميز",
      name: "أحمد، 34 — دبي",
      result: "−22 كيلو في 14 أسبوع",
      quote: "جربت ثلاثة مدربين قبل كريم. هذه المرة الأولى التي فهمت فيها ما أفعله ولماذا. النتائج تتحدث عن نفسها.",
    },
    gallery: {
      eyebrow: "التحولات",
      headline: "عملاء حقيقيون. نتائج حقيقية.",
      beforeLabel: "قبل",
      afterLabel: "بعد",
      pairs: [
        { name: "أحمد ر.", duration: "14 أسبوع", result: "−22 كيلو" },
        { name: "سارة م.", duration: "12 أسبوع", result: "−14 كيلو" },
        { name: "فيصل ك.", duration: "16 أسبوع", result: "−18 كيلو" },
      ],
    },
    testimonials: {
      eyebrow: "كلمات العملاء",
      headline: "ما يقولونه بعد إنجاز العمل.",
      items: [
        { name: "أحمد راشد", handle: "دبي، الإمارات", stars: 5, text: "جئت بشك. غادرت بعد خسارة 22 كيلو وعلاقة مختلفة تماماً مع الطعام والتدريب. كريم حقيقي." },
        { name: "سارة منصور", handle: "القاهرة، مصر", stars: 5, text: "الخطة تناسبت مع حياتي. السفر، رمضان، مناسبات العائلة — لا شيء عطّلني لأن البرنامج بُني للعالم الحقيقي." },
        { name: "جيمس هارلي", handle: "لندن، المملكة المتحدة", stars: 5, text: "ثلاث سنوات من المحاولة وحيداً. اثنا عشر أسبوعاً مع كريم وأخيراً فهمت ما كنت أخطئ فيه." },
        { name: "نورة الحمد", handle: "الرياض، المملكة العربية السعودية", stars: 5, text: "أفضل استثمار قدمته لنفسي. نقطة. المحاسبة والهيكل غيّرا كل شيء بالنسبة لي." },
      ],
    },
    resources: {
      eyebrow: "موارد مجانية",
      headline: "خذ شيئاً معك.",
      items: [
        { tag: "دليل", title: "كتيّب خسارة الدهون في 90 يوماً", desc: "إطار عمل مباشر لخسارة الدهون بشكل مستدام — بدون هوس بالسعرات." },
        { tag: "فيديو", title: "5 أخطاء تدريبية تقتل تقدمك", desc: "الأخطاء التي أراها في ٪80 من الرياضيين الذاتيين. صحّحها أولاً." },
        { tag: "قالب", title: "قالب تحضير وجبات أسبوعي", desc: "هيكل تحضير الوجبات الذي أستخدمه مع عملائي الذين يسافرون باستمرار." },
      ],
    },
    pricing: {
      eyebrow: "الاستثمار",
      headline: "أسعار واضحة. بلا مفاجآت.",
      note: "تشمل جميع البرامج مكالمة استكشافية مجانية لمدة 20 دقيقة قبل الالتزام.",
    },
    faq: {
      eyebrow: "الأسئلة الشائعة",
      headline: "إجابات على أسئلتك.",
      items: [
        { q: "هل أحتاج عضوية صالة رياضية؟", a: "ليس بالضرورة. يمكن تصميم البرامج للصالة أو المنزل أو السفر. سنقيّم إعدادك في المكالمة الأولى." },
        { q: "كيف تعمل جلسات المتابعة؟", a: "متابعات أسبوعية بالفيديو أو الصوت عبر واتساب أو زوم حسب تفضيلك، مع إمكانية المراسلة طوال الأسبوع." },
        { q: "ماذا لو كان لدي إصابة أو قيد؟", a: "جميع البرامج مكيّفة لحالتك الجسدية الحالية. سأراجع تاريخك وأصمم حولها لا ضدها." },
        { q: "متى سأرى نتائج؟", a: "يرى معظم العملاء تغييرات قابلة للقياس في 3-4 أسابيع. تتجلى تحولات تكوين الجسم الكبيرة عادةً في 8-10 أسابيع." },
        { q: "هل هذا لخسارة الوزن فقط؟", a: "لا. زيادة العضلات، الأداء الرياضي، العودة للرياضة بعد إعادة التأهيل، وتحسين الصحة العامة كلها في النطاق." },
        { q: "ما اللغات التي تدرّب بها؟", a: "الإنجليزية والعربية. البرامج والمتابعات متاحة بكلتيهما." },
      ],
    },
    finalCta: {
      headline: "نسختك التالية تبدأ بقرار واحد.",
      sub: "أماكن محدودة كل شهر. قدّم الآن لتأمين مكالمتك الاستكشافية.",
      cta: "تقدم للتدريب",
      note: "مكالمة استكشافية مجانية 20 دق · بلا التزام مسبق",
    },
    footer: {
      tagline: "تدريب لياقة احترافي لمن يأخذه بجدية.",
      links: ["سياسة الخصوصية", "الشروط", "التواصل"],
      copy: "© 2025 كريم حداد كوتشينج. جميع الحقوق محفوظة.",
    },
  },
};

// ─── UTILITY ──────────────────────────────────────────────────────────────────
function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="#ea580c" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 1l1.545 4.753H13.18l-3.877 2.817L10.848 13 7 10.182 3.152 13l1.545-4.43L.82 5.753H5.455z" />
    </svg>
  );
}

function ArrowIcon({ className = "" }) {
  return (
    <svg className={`inline-block rtl:-scale-x-100 ${className}`} width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.5 9h11M9.5 4l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── BEFORE/AFTER SLIDER ──────────────────────────────────────────────────────
function BeforeAfterSlider({ beforeSrc, afterSrc, beforeLabel, afterLabel }) {
  const [pos, setPos] = useState(50);
  const containerRef = useRef(null);
  const dragging = useRef(false);

  const handleMove = (clientX) => {
    if (!containerRef.current || !dragging.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    setPos((x / rect.width) * 100);
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden w-full aspect-[3/4] cursor-col-resize select-none group"
      onMouseDown={() => (dragging.current = true)}
      onMouseUp={() => (dragging.current = false)}
      onMouseLeave={() => (dragging.current = false)}
      onMouseMove={(e) => handleMove(e.clientX)}
      onTouchStart={() => (dragging.current = true)}
      onTouchEnd={() => (dragging.current = false)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
    >
      {/* After */}
      <img src={afterSrc} alt={afterLabel} className="absolute inset-0 w-full h-full object-cover" />

      {/* Before clipped */}
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img src={beforeSrc} alt={beforeLabel} className="absolute inset-0 w-full h-full object-cover" />
        <span className="absolute top-3 start-3 bg-stone-900/80 text-white text-xs font-body tracking-widest uppercase px-2 py-1">
          {beforeLabel}
        </span>
      </div>

      {/* After label */}
      <span className="absolute top-3 end-3 bg-orange-600/90 text-white text-xs font-body tracking-widest uppercase px-2 py-1">
        {afterLabel}
      </span>

      {/* Divider */}
      <div className="absolute top-0 bottom-0 w-px bg-white/90 shadow-[0_0_8px_rgba(0,0,0,0.4)]" style={{ left: `${pos}%` }} />
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center border border-stone-200"
        style={{ left: `${pos}%` }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#111" strokeWidth="1.8" xmlns="http://www.w3.org/2000/svg">
          <path d="M11.5 5l4 4-4 4M6.5 5l-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

// ─── FAQ ITEM ─────────────────────────────────────────────────────────────────
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-stone-200 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-6 py-5 text-start font-display text-base md:text-lg text-stone-900 hover:text-orange-600 transition-colors duration-200"
        aria-expanded={open}
      >
        <span>{q}</span>
        <span className={`shrink-0 w-6 h-6 flex items-center justify-center border border-stone-300 rounded-full transition-transform duration-300 ${open ? "rotate-45" : ""}`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 1v10M1 6h10" strokeLinecap="round" />
          </svg>
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? "max-h-60 pb-5" : "max-h-0"}`}>
        <p className="font-body text-stone-600 leading-relaxed text-sm md:text-base">{a}</p>
      </div>
    </div>
  );
}

// ─── SECTION LABEL ────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <p className="font-body text-xs tracking-[0.2em] uppercase text-orange-600 mb-3 flex items-center gap-2">
      <span className="inline-block w-5 h-px bg-orange-600" />
      {children}
    </p>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function Page() {
  const locale = useLocale();
  const t = content[locale] || content.en;

  const heroRef = useRef(null);
  const statsRef = useRef(null);
  const aboutRef = useRef(null);
  const whyRef = useRef(null);
  const methodRef = useRef(null);
  const servicesRef = useRef(null);
  const ctaRef = useRef(null);
  const marqueeRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero stagger entrance
      gsap.fromTo(
        ".hero-word",
        { y: 80,  },
        { y: 0, opacity: 1, duration: 1, ease: "power3.out", stagger: 0.12, delay: 0.2 }
      );
      gsap.fromTo(
        ".hero-sub",
        { y: 30,  },
        { y: 0, opacity: 1, duration: 0.9, ease: "power2.out", delay: 0.75 }
      );
      gsap.fromTo(
        ".hero-cta",
        { y: 20,  },
        { y: 0, opacity: 1, duration: 0.8, ease: "power2.out", delay: 1 }
      );
      gsap.fromTo(
        ".hero-image",
        { scale: 1.05,  },
        { scale: 1, opacity: 1, duration: 1.4, ease: "power2.out", delay: 0.1 }
      );

      // Stats counter/fade
      gsap.fromTo(
        ".stat-item",
        { y: 40,  },
        {
          y: 0, opacity: 1, duration: 0.7, ease: "power2.out", stagger: 0.12,
          scrollTrigger: { trigger: statsRef.current, start: "top 75%" },
        }
      );

      // About section
      gsap.fromTo(
        ".about-text",
        { x: -40,  },
        {
          x: 0, opacity: 1, duration: 0.9, ease: "power2.out", stagger: 0.1,
          scrollTrigger: { trigger: aboutRef.current, start: "top 70%" },
        }
      );
      gsap.fromTo(
        ".about-img",
        { x: 40,   scale: 1.02 },
        {
          x: 0, opacity: 1, scale: 1, duration: 1.1, ease: "power2.out",
          scrollTrigger: { trigger: aboutRef.current, start: "top 70%" },
        }
      );

      // Why items
      gsap.fromTo(
        ".why-item",
        { y: 50,  },
        {
          y: 0, opacity: 1, duration: 0.7, ease: "power2.out", stagger: 0.1,
          scrollTrigger: { trigger: whyRef.current, start: "top 70%" },
        }
      );

      // Method steps
      gsap.fromTo(
        ".method-step",
        { x: -30,  },
        {
          x: 0, opacity: 1, duration: 0.7, ease: "power2.out", stagger: 0.12,
          scrollTrigger: { trigger: methodRef.current, start: "top 70%" },
        }
      );

      // Service cards
      gsap.fromTo(
        ".service-card",
        { y: 60,  },
        {
          y: 0, opacity: 1, duration: 0.75, ease: "power2.out", stagger: 0.1,
          scrollTrigger: { trigger: servicesRef.current, start: "top 70%" },
        }
      );

      // Final CTA
      gsap.fromTo(
        ".cta-band-inner",
        { y: 40,  },
        {
          y: 0, opacity: 1, duration: 0.9, ease: "power2.out",
          scrollTrigger: { trigger: ctaRef.current, start: "top 75%" },
        }
      );

      // Marquee: ensure infinite scroll
      const marquee = marqueeRef.current;
      if (marquee) {
        const inner = marquee.querySelector(".marquee-inner");
        if (inner) {
          gsap.to(inner, {
            x: "-50%",
            duration: 24,
            ease: "linear",
            repeat: -1,
          });
        }
      }
    });

    return () => ctx.revert();
  }, []);

  const [navScrolled, setNavScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="bg-stone-50 font-body text-stone-900 overflow-x-hidden">
      {/* ── 1. NAV ── */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          navScrolled ? "bg-stone-50/95 backdrop-blur-sm border-b border-stone-200 py-3" : "bg-transparent py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 md:px-10 flex items-center justify-between gap-6">
          <a href="#" className="font-display text-lg tracking-widest text-stone-900 uppercase shrink-0">
            {t.nav.logo}
          </a>
          <ul className="hidden lg:flex items-center gap-7">
            {t.nav.links.map((link) => (
              <li key={link}>
                <a href="#" className="font-body text-sm text-stone-600 hover:text-orange-600 transition-colors tracking-wide">
                  {link}
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#"
            className="shrink-0 inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-body text-sm tracking-wide px-5 py-2.5 transition-colors duration-200"
          >
            {t.nav.cta}
          </a>
        </div>
      </nav>

      {/* ── 2. HERO ── */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center pt-24 pb-16 bg-stone-900 overflow-hidden"
      >
        {/* BG image */}
        <div className="hero-image absolute inset-0">
          <img src={images.hero} alt="" className="w-full h-full object-cover object-top opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-stone-900/60 via-stone-900/40 to-stone-900/90" />
        </div>

        {/* Decorative vertical text */}
        <div className="hidden xl:block absolute top-1/2 -translate-y-1/2 end-10 rotate-90 origin-center font-body text-[10px] tracking-[0.3em] uppercase text-white/20">
          Elite Personal Coach
        </div>

        <div className="relative max-w-7xl mx-auto px-5 md:px-10 w-full">
          <p className="hero-word font-body text-xs tracking-[0.25em] uppercase text-orange-500 mb-6 flex items-center gap-3">
            <span className="w-8 h-px bg-orange-500" />
            {t.hero.eyebrow}
          </p>
          <div className="overflow-hidden">
            <h1 className="font-display text-[clamp(3rem,9vw,8rem)] leading-[0.92] tracking-tight text-white mb-8">
              {t.hero.headline.map((line, i) => (
                <span key={i} className="hero-word block">{line}</span>
              ))}
            </h1>
          </div>
          <p className="hero-sub font-body text-base md:text-xl text-stone-300 max-w-xl leading-relaxed mb-10">
            {t.hero.sub}
          </p>
          <div className="hero-cta flex flex-wrap items-center gap-5">
            <a
              href="#"
              className="inline-flex items-center gap-3 bg-orange-600 hover:bg-orange-700 text-white font-body text-sm tracking-wide px-8 py-4 transition-colors duration-200"
            >
              {t.hero.cta}
              <ArrowIcon />
            </a>
            <span className="font-body text-xs text-stone-400 tracking-wide">{t.hero.ctaSub}</span>
          </div>

          {/* Scroll cue */}
          <div className="absolute bottom-8 start-5 md:start-10 flex items-center gap-3">
            <div className="w-px h-12 bg-white/20 relative overflow-hidden">
              <div className="absolute top-0 w-full h-1/2 bg-white/60 animate-bounce" />
            </div>
            <span className="font-body text-[10px] tracking-[0.2em] uppercase text-white/30">{t.hero.scrollLabel}</span>
          </div>
        </div>
      </section>

      {/* ── 3. TRUST BAR ── */}
      <section className="bg-white border-b border-stone-100 py-6">
        <div className="max-w-7xl mx-auto px-5 md:px-10 flex flex-col sm:flex-row items-center gap-5 sm:gap-10">
          <p className="font-body text-xs tracking-[0.2em] uppercase text-stone-400 shrink-0">{t.trust.label}</p>
          <div className="w-px h-5 bg-stone-200 hidden sm:block" />
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-6 md:gap-10">
            {t.trust.brands.map((brand) => (
              <span key={brand} className="font-display text-sm text-stone-400 tracking-wide uppercase hover:text-stone-600 transition-colors">
                {brand}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. MARQUEE ── */}
      <section ref={marqueeRef} className="bg-orange-600 py-4 overflow-hidden" aria-hidden="true">
        <div className="marquee-inner flex gap-0 whitespace-nowrap will-change-transform">
          {[...t.marquee, ...t.marquee].map((item, i) => (
            <span key={i} className="font-display text-sm tracking-[0.15em] uppercase text-white/90 px-8 flex items-center gap-8">
              {item}
              <span className="w-1.5 h-1.5 rounded-full bg-white/40 shrink-0" />
            </span>
          ))}
        </div>
      </section>

      {/* ── 5. STATS ── */}
      <section ref={statsRef} className="bg-stone-900 py-20">
        <div className="max-w-7xl mx-auto px-5 md:px-10 grid grid-cols-2 lg:grid-cols-4 gap-px bg-stone-700">
          {t.stats.map((stat, i) => (
            <div key={i} className="stat-item bg-stone-900 p-10 text-center">
              <div className="font-display text-[clamp(2.5rem,5vw,4rem)] text-white leading-none tracking-tight mb-2">
                {stat.value}
              </div>
              <p className="font-body text-xs text-stone-400 tracking-[0.15em] uppercase">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 6. ABOUT ── */}
      <section ref={aboutRef} className="py-24 md:py-32 bg-stone-50">
        <div className="max-w-7xl mx-auto px-5 md:px-10 grid md:grid-cols-2 gap-16 lg:gap-24 items-center">
          <div>
            <div className="about-text">
              <SectionLabel>{t.about.eyebrow}</SectionLabel>
            </div>
            <h2 className="about-text font-display text-[clamp(2.5rem,5vw,4rem)] leading-[1] tracking-tight text-stone-900 mb-2">
              {t.about.name}
            </h2>
            <p className="about-text font-body text-sm text-orange-600 tracking-widest uppercase mb-8">{t.about.title}</p>
            <p className="about-text font-body text-stone-700 leading-relaxed mb-5 text-base md:text-lg">{t.about.bio1}</p>
            <p className="about-text font-body text-stone-600 leading-relaxed mb-8">{t.about.bio2}</p>
            <div className="about-text flex flex-wrap gap-2 mb-8">
              {t.about.badges.map((b) => (
                <span key={b} className="font-body text-xs tracking-wide border border-stone-300 text-stone-600 px-3 py-1.5">
                  {b}
                </span>
              ))}
            </div>
            <a href="#" className="about-text inline-flex items-center gap-2 font-body text-sm text-orange-600 hover:text-orange-700 transition-colors font-medium tracking-wide">
              {t.about.cta}
            </a>
          </div>
          <div className="about-img relative">
            <div className="relative z-10 aspect-[3/4] overflow-hidden">
              <img src={images.about} alt={t.about.name} className="w-full h-full object-cover" />
            </div>
            {/* Decorative frame */}
            <div className="absolute -bottom-4 -end-4 w-2/3 h-2/3 border border-orange-200 z-0" />
            <div className="absolute -top-3 -start-3 font-display text-[8rem] leading-none text-stone-100 select-none z-0 pointer-events-none">
              K
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. WHY ── */}
      <section ref={whyRef} className="py-24 bg-white border-t border-stone-100">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <SectionLabel>{t.why.eyebrow}</SectionLabel>
          <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] text-stone-900 tracking-tight mb-16 max-w-lg">
            {t.why.headline}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-stone-100">
            {t.why.items.map((item) => (
              <div key={item.num} className="why-item bg-white p-8 group hover:bg-stone-50 transition-colors duration-200">
                <span className="font-display text-[3rem] leading-none text-stone-100 group-hover:text-orange-100 transition-colors duration-300 block mb-6">
                  {item.num}
                </span>
                <h3 className="font-display text-xl text-stone-900 mb-3 leading-tight">{item.title}</h3>
                <p className="font-body text-sm text-stone-500 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. WHO THIS IS FOR ── */}
      <section className="py-24 bg-stone-900">
        <div className="max-w-7xl mx-auto px-5 md:px-10 grid md:grid-cols-2 gap-16 items-start">
          <div>
            <SectionLabel>{t.whoFor.eyebrow}</SectionLabel>
            <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] text-white tracking-tight mb-6 leading-tight">
              {t.whoFor.headline}
            </h2>
            <p className="font-body text-stone-400 leading-relaxed mb-8">{t.whoFor.body}</p>
            <p className="font-body text-xs text-stone-500 tracking-wide italic border-t border-stone-700 pt-6">{t.whoFor.notFor}</p>
          </div>
          <ul className="space-y-0 border border-stone-700">
            {t.whoFor.profiles.map((profile, i) => (
              <li key={i} className="flex items-start gap-4 p-5 border-b border-stone-700 last:border-0 hover:bg-stone-800/50 transition-colors">
                <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-orange-600/20 flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#ea580c" strokeWidth="1.8" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 5l2 2.5 4-4.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="font-body text-stone-300 text-sm leading-relaxed">{profile}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 9. METHOD ── */}
      <section ref={methodRef} className="py-24 md:py-32 bg-stone-50 border-t border-stone-100">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <SectionLabel>{t.method.eyebrow}</SectionLabel>
          <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] text-stone-900 tracking-tight mb-16">
            {t.method.headline}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-stone-200">
            {t.method.steps.map((step, i) => (
              <div key={step.num} className="method-step p-8 border-e border-stone-200 last:border-e-0 relative">
                {i < t.method.steps.length - 1 && (
                  <div className="absolute top-8 end-0 translate-x-1/2 z-10 hidden lg:block">
                    <ArrowIcon className="text-orange-300" />
                  </div>
                )}
                <div className="font-display text-5xl text-orange-100 mb-8">{step.num}</div>
                <h3 className="font-display text-lg text-stone-900 mb-3">{step.title}</h3>
                <p className="font-body text-sm text-stone-500 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. SERVICES ── */}
      <section ref={servicesRef} className="py-24 bg-white border-t border-stone-100">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <SectionLabel>{t.services.eyebrow}</SectionLabel>
          <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] text-stone-900 tracking-tight mb-16">
            {t.services.headline}
          </h2>
          <div className="grid md:grid-cols-3 gap-px bg-stone-100">
            {t.services.items.map((service, i) => (
              <div
                key={i}
                className={`service-card flex flex-col p-8 md:p-10 ${
                  i === 0 ? "bg-stone-900 text-white" : "bg-white text-stone-900"
                }`}
              >
                <span className={`font-body text-xs tracking-[0.2em] uppercase mb-6 inline-block px-3 py-1.5 ${
                  i === 0 ? "bg-orange-600 text-white" : "border border-stone-200 text-stone-500"
                }`}>
                  {service.tag}
                </span>
                <h3 className={`font-display text-2xl mb-3 ${i === 0 ? "text-white" : "text-stone-900"}`}>{service.name}</h3>
                <p className={`font-body text-sm leading-relaxed mb-8 ${i === 0 ? "text-stone-400" : "text-stone-500"}`}>{service.desc}</p>
                <ul className="space-y-2.5 mb-10 flex-1">
                  {service.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 font-body text-sm">
                      <span className={`shrink-0 ${i === 0 ? "text-orange-500" : "text-orange-600"}`}>✓</span>
                      <span className={i === 0 ? "text-stone-300" : "text-stone-600"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-stone-700/30 pt-6 flex items-end justify-between gap-4">
                  <div>
                    <div className={`font-display text-3xl ${i === 0 ? "text-white" : "text-stone-900"}`}>{service.price}</div>
                    <div className={`font-body text-xs ${i === 0 ? "text-stone-500" : "text-stone-400"}`}>{service.period}</div>
                  </div>
                  <a
                    href="#"
                    className={`inline-flex items-center gap-2 font-body text-sm tracking-wide px-5 py-2.5 transition-colors duration-200 ${
                      i === 0
                        ? "bg-orange-600 hover:bg-orange-700 text-white"
                        : "border border-stone-300 hover:border-orange-600 hover:text-orange-600 text-stone-700"
                    }`}
                  >
                    {service.cta}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 11. FEATURED TRANSFORMATION ── */}
      <section className="py-24 bg-stone-900">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <SectionLabel>{t.featured.eyebrow}</SectionLabel>
          <div className="grid md:grid-cols-2 gap-12 lg:gap-24 items-center">
            <div>
              <BeforeAfterSlider
                beforeSrc={images.featured.before}
                afterSrc={images.featured.after}
                beforeLabel={t.gallery.beforeLabel}
                afterLabel={t.gallery.afterLabel}
              />
            </div>
            <div>
              <div className="font-display text-[5rem] leading-none text-stone-700 mb-4">"</div>
              <blockquote className="font-display text-xl md:text-2xl text-white leading-snug mb-8">
                {t.featured.quote}
              </blockquote>
              <div className="flex items-center gap-2 mb-3">
                {Array(5).fill(0).map((_, i) => <StarIcon key={i} />)}
              </div>
              <p className="font-display text-lg text-stone-300">{t.featured.name}</p>
              <p className="font-body text-sm text-orange-500 tracking-wide mt-1">{t.featured.result}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 12. BEFORE/AFTER GALLERY ── */}
      <section className="py-24 bg-stone-50 border-t border-stone-100">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <SectionLabel>{t.gallery.eyebrow}</SectionLabel>
          <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] text-stone-900 tracking-tight mb-16">
            {t.gallery.headline}
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {t.gallery.pairs.map((pair, i) => (
              <div key={i} className="group">
                <BeforeAfterSlider
                  beforeSrc={images[`before${i + 1}`]}
                  afterSrc={images[`after${i + 1}`]}
                  beforeLabel={t.gallery.beforeLabel}
                  afterLabel={t.gallery.afterLabel}
                />
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="font-display text-base text-stone-900">{pair.name}</p>
                    <p className="font-body text-xs text-stone-400 tracking-wide mt-0.5">{pair.duration}</p>
                  </div>
                  <span className="font-display text-lg text-orange-600">{pair.result}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 13. TESTIMONIALS ── */}
      <section className="py-24 bg-white border-t border-stone-100">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <SectionLabel>{t.testimonials.eyebrow}</SectionLabel>
          <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] text-stone-900 tracking-tight mb-16">
            {t.testimonials.headline}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-stone-100">
            {t.testimonials.items.map((item, i) => (
              <div key={i} className="bg-white p-8 flex flex-col gap-5">
                <div className="flex gap-0.5">
                  {Array(item.stars).fill(0).map((_, j) => <StarIcon key={j} />)}
                </div>
                <p className="font-body text-sm text-stone-600 leading-relaxed flex-1">"{item.text}"</p>
                <div className="flex items-center gap-3 border-t border-stone-100 pt-5">
                  <img
                    src={images.testimonials[i]}
                    alt={item.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                  <div>
                    <p className="font-display text-sm text-stone-900">{item.name}</p>
                    <p className="font-body text-xs text-stone-400">{item.handle}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 14. RESOURCES ── */}
      <section className="py-24 bg-stone-50 border-t border-stone-100">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <SectionLabel>{t.resources.eyebrow}</SectionLabel>
          <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] text-stone-900 tracking-tight mb-16">
            {t.resources.headline}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {t.resources.items.map((res, i) => {
              const img = [images.resource1, images.resource2, images.resource3][i];
              return (
                <a key={i} href="#" className="group block border border-stone-200 bg-white hover:border-orange-300 transition-colors duration-200 overflow-hidden">
                  <div className="aspect-video overflow-hidden">
                    <img src={img} alt={res.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-6">
                    <span className="font-body text-xs tracking-[0.2em] uppercase text-orange-600 mb-3 block">{res.tag}</span>
                    <h3 className="font-display text-lg text-stone-900 mb-2 group-hover:text-orange-600 transition-colors">{res.title}</h3>
                    <p className="font-body text-sm text-stone-500 leading-relaxed">{res.desc}</p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 15. PRICING ── */}
      <section className="py-16 bg-white border-t border-stone-100">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <SectionLabel>{t.pricing.eyebrow}</SectionLabel>
          <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] text-stone-900 tracking-tight mb-4">
            {t.pricing.headline}
          </h2>
          <p className="font-body text-sm text-stone-400 mb-12">{t.pricing.note}</p>
          {/* Pricing reuses the services grid */}
          <div className="grid md:grid-cols-3 gap-px bg-stone-100">
            {t.services.items.map((service, i) => (
              <div key={i} className={`flex items-center justify-between gap-6 p-8 ${i === 0 ? "bg-stone-900" : "bg-white"}`}>
                <div>
                  <p className={`font-display text-lg mb-1 ${i === 0 ? "text-white" : "text-stone-900"}`}>{service.name}</p>
                  <p className={`font-body text-xs ${i === 0 ? "text-stone-400" : "text-stone-400"}`}>{service.tag}</p>
                </div>
                <div className="text-end shrink-0">
                  <p className={`font-display text-3xl ${i === 0 ? "text-white" : "text-stone-900"}`}>{service.price}</p>
                  <p className={`font-body text-xs ${i === 0 ? "text-stone-500" : "text-stone-400"}`}>{service.period}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 16. FAQ ── */}
      <section className="py-24 bg-stone-50 border-t border-stone-100">
        <div className="max-w-3xl mx-auto px-5 md:px-10">
          <SectionLabel>{t.faq.eyebrow}</SectionLabel>
          <h2 className="font-display text-[clamp(2rem,4vw,3rem)] text-stone-900 tracking-tight mb-12">
            {t.faq.headline}
          </h2>
          <div>
            {t.faq.items.map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── 17. FINAL CTA BAND ── */}
      <section ref={ctaRef} className="bg-orange-600 py-24 overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
          <div className="font-display text-[20rem] leading-none text-white/5 absolute -top-10 -start-10 tracking-tighter">GO</div>
        </div>
        <div className="cta-band-inner relative max-w-4xl mx-auto px-5 md:px-10 text-center">
          <h2 className="font-display text-[clamp(2rem,5vw,4rem)] text-white leading-tight tracking-tight mb-6">
            {t.finalCta.headline}
          </h2>
          <p className="font-body text-white/80 text-base md:text-lg mb-10 max-w-xl mx-auto">{t.finalCta.sub}</p>
          <a
            href="#"
            className="inline-flex items-center gap-3 bg-white text-orange-600 hover:bg-stone-100 font-body tracking-wide px-10 py-4 text-sm transition-colors duration-200 mb-4"
          >
            {t.finalCta.cta}
            <ArrowIcon />
          </a>
          <p className="font-body text-xs text-white/50 tracking-wide">{t.finalCta.note}</p>
        </div>
      </section>

      {/* ── 18. FOOTER ── */}
      <footer className="bg-stone-900 py-12 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-5 md:px-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
          <div>
            <p className="font-display text-xl tracking-widest text-white uppercase mb-2">{t.nav.logo}</p>
            <p className="font-body text-sm text-stone-500">{t.footer.tagline}</p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            {t.footer.links.map((link) => (
              <a key={link} href="#" className="font-body text-xs text-stone-500 hover:text-white transition-colors tracking-wide">
                {link}
              </a>
            ))}
          </div>
          <p className="font-body text-xs text-stone-600">{t.footer.copy}</p>
        </div>
      </footer>
    </main>
  );
}

/*
 * ─── CONTENT SHAPE ────────────────────────────────────────────────────────────
 *
 * content.en / content.ar = {
 *   nav:          { logo, links[], cta }
 *   hero:         { eyebrow, headline[], sub, cta, ctaSub, scrollLabel }
 *   trust:        { label, brands[] }
 *   marquee:      string[]
 *   stats:        { value, label }[]
 *   about:        { eyebrow, name, title, bio1, bio2, cta, badges[] }
 *   why:          { eyebrow, headline, items[{ num, title, body }] }
 *   whoFor:       { eyebrow, headline, body, profiles[], notFor }
 *   method:       { eyebrow, headline, steps[{ num, title, body }] }
 *   services:     { eyebrow, headline, items[{ tag, name, desc, features[], price, period, cta }] }
 *   featured:     { eyebrow, name, result, quote }
 *   gallery:      { eyebrow, headline, beforeLabel, afterLabel, pairs[{ name, duration, result }] }
 *   testimonials: { eyebrow, headline, items[{ name, handle, stars, text }] }
 *   resources:    { eyebrow, headline, items[{ tag, title, desc }] }
 *   pricing:      { eyebrow, headline, note }
 *   faq:          { eyebrow, headline, items[{ q, a }] }
 *   finalCta:     { headline, sub, cta, note }
 *   footer:       { tagline, links[], copy }
 * }
 *
 * images = {
 *   hero, about,
 *   before1, after1, before2, after2, before3, after3,
 *   featured: { before, after },
 *   testimonials: string[],
 *   resource1, resource2, resource3
 * }
 * ────────────────────────────────────────────────────────────────────────────────
 */