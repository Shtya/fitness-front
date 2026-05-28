'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocale } from 'next-intl';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

// ─── IMAGES ──────────────────────────────────────────────────
const images = {
  hero: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=85&fit=crop',
  about: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=85&fit=crop',
  service1: 'https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=700&q=80&fit=crop',
  service2: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=700&q=80&fit=crop',
  service3: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=700&q=80&fit=crop',
  transformFeatBefore: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=500&q=75&fit=crop',
  transformFeatAfter: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=500&q=75&fit=crop',
  before1: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=500&q=75&fit=crop',
  after1: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=500&q=75&fit=crop',
  before2: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=500&q=75&fit=crop',
  after2: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=500&q=75&fit=crop',
  before3: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=500&q=75&fit=crop',
  after3: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=500&q=75&fit=crop',
  before4: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=500&q=75&fit=crop',
  after4: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=500&q=75&fit=crop',
  before5: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=500&q=75&fit=crop',
  after5: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=500&q=75&fit=crop',
  before6: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=500&q=75&fit=crop',
  after6: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=500&q=75&fit=crop',
  testimonial1: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80&fit=crop&crop=face',
  testimonial2: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&q=80&fit=crop&crop=face',
  testimonial3: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&q=80&fit=crop&crop=face',
  testimonial4: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&q=80&fit=crop&crop=face',
};

// ─── CONTENT ─────────────────────────────────────────────────
const content = {
  en: {
    nav: {
      logo: 'JOKU',
      tagline: 'COACH',
      links: ['About', 'Method', 'Programs', 'Results', 'Pricing'],
      cta: 'Start Now',
      lang: 'عربي',
    },
    hero: {
      eyebrow: 'Super Saiyan',
      headline: ['Let The Hero', 'Inside You', 'Come Out'],
      sub: 'The best investment you can make is investing in your health.',
      cta: 'Start Your Journey',
      ctaSub: 'Limited spots available',
      scrollLabel: 'Scroll',
    },
    trust: [
      { value: '500+', label: 'Transformations' },
      { value: '5+', label: 'Years Experience' },
      { value: '3+', label: 'Certifications' },
      { value: '4.9★', label: 'Average Rating' },
      { value: '#1', label: 'Physique Egypt' },
    ],
    marquee: ['Science-Based Training', '500+ Transformations', 'Men & Women', 'Custom Nutrition', 'Egypt & Worldwide', 'Online Coaching', 'Body Recomposition', 'Strength Programming', 'Real Results'],
    stats: [
      { number: 500, suffix: '+', label: 'Successful transformations worldwide' },
      { number: 5, suffix: '+', label: 'Years of professional coaching' },
      { number: 3, suffix: '+', label: 'Certified credentials' },
      { number: 4.9, suffix: '★', label: 'Average client rating', decimal: true },
    ],
    about: {
      eyebrow: 'The Coach',
      name: 'Youssef "Joku"',
      title: '#1 Physique Egypt · Sports Nutrition Certified',
      bio1: 'My name is Youssef, known as "Joku" — named after my childhood love for Dragon Ball Z anime, inspired by the hero Goku. I ranked #1 in the Physique category at the first natural bodybuilding championship held in Egypt.',
      bio2: 'With over 5 years of experience and hundreds of successful transformations, I bring passion, ambition, and dedication to helping you achieve the healthy and physical life you dream of.',
      quote: "Every superhero you see now had an ordinary beginning. Your transformation starts today.",
      certs: ['#1 Physique Egypt', 'Sports Nutrition Certified', '5+ Years Experience', '500+ Transformations'],
      imageAlt: 'Captain Joku',
    },
    why: {
      label: 'My Mission & Your Next Role',
      headline: 'Push your limits. Become a hero.',
      items: [
        { title: 'Push Your Limits', desc: 'Challenge yourself consistently and commit to surpassing your current capabilities.' },
        { title: 'Science & Experience', desc: "Training programs with Coach Joku are built on proven scientific principles in exercise and nutrition." },
        { title: 'Heroes Community', desc: 'Join a community full of warrior heroes who overcame themselves in their own journeys.' },
        { title: 'Communication & Interaction', desc: 'Training with Joku is completely different — built on science, experience, understanding, and encouragement.' },
        { title: 'Custom Nutrition Plan', desc: 'A nutrition system tailored to your capabilities, circumstances, and budget to reach your goal.' },
        { title: 'Ongoing Follow-up', desc: 'Regular follow-up to ensure progress and adjust the plan based on your actual results.' },
      ],
    },
    forWho: {
      eyebrow: "Who It's For",
      heading: 'Men & Women. Serious about change.',
      items: [
        { label: 'Beginners', desc: 'Starting right beats restarting forever.' },
        { label: 'Fat Loss', desc: 'Sustainable cuts without losing muscle.' },
        { label: 'Muscle Gain', desc: 'Structured hypertrophy that actually compounds.' },
        { label: 'Body Recomp', desc: 'Burn fat and build simultaneously.' },
        { label: 'Men & Women', desc: 'Programs tailored for both genders.' },
        { label: 'Online Clients', desc: 'Full coaching from anywhere in the world.' },
        { label: 'Accountability Seekers', desc: 'For those who need more than a plan.' },
        { label: 'Egypt & Worldwide', desc: 'Clients from Egypt, KSA, Qatar, Netherlands, Russia & more.' },
      ],
    },
    method: {
      eyebrow: 'How To Subscribe',
      headline: 'Simple steps to start immediately.',
      steps: [
        { num: '01', title: 'Choose Your Package', body: 'Select the package that suits your goal from my three available options.' },
        { num: '02', title: 'Pay Subscription', body: 'Pay the subscription fee via the available and most convenient method for you.' },
        { num: '03', title: 'Confirm Transfer', body: 'Send a screenshot as payment proof on WhatsApp.' },
        { num: '04', title: 'Connect & Start', body: 'I will contact you within 24 hours to collect your data and start your journey immediately.' },
        { num: '05', title: 'Custom Plan', body: 'You receive a fully customized workout and nutrition system based on your goal and circumstances.' },
        { num: '06', title: 'Periodic Follow-up', body: 'Regular follow-up according to your chosen package to ensure continuous progress toward your goal.' },
      ],
    },
    services: {
      eyebrow: 'Subscription Plans',
      headline: 'Three packages. One goal.',
      items: [
        { num: '01', title: 'GOHAN Package', sub: 'Basic Plan', desc: 'Workout system + custom nutrition plan + follow-up every 15 days. Questions answered within 24-72 hours.', cta: 'Subscribe Now', imageAlt: 'GOHAN Package' },
        { num: '02', title: 'VEGETA Package', sub: 'Intermediate Plan', desc: 'Workout system + nutrition plan + cooking book + follow-up every 10 days. Daily responses + 1 FREEZE allowed.', cta: 'Subscribe Now', imageAlt: 'VEGETA Package' },
        { num: '03', title: 'JOKU Package', sub: 'Super Package', desc: 'Workout system + nutrition plan + cooking book + follow-up every 7 days + 2 calls/month. Daily responses + 2 FREEZEs.', cta: 'Subscribe Now', imageAlt: 'JOKU Package' },
      ],
      pricingNote: 'Results vary based on commitment and duration. The longer and more committed you are, the stronger your results.',
      tiers: [
        {
          name: 'GOHAN',
          price: '650',
          period: 'EGP/month',
          highlight: false,
          features: ['Workout system with video explanations', 'Custom nutrition plan', 'Follow-up every 15 days', 'Questions answered in 24-72 hours'],
          cta: 'Subscribe Now',
        },
        {
          name: 'VEGETA',
          price: '1,000',
          period: 'EGP/month',
          highlight: true,
          badge: 'Best Seller',
          features: ['Workout system with video explanations', 'Custom nutrition plan', 'Cooking book for healthy meals', 'Follow-up every 10 days', 'Daily responses + 1 FREEZE'],
          cta: 'Subscribe Now',
        },
        {
          name: 'JOKU',
          price: '1,500',
          period: 'EGP/month',
          highlight: false,
          features: ['Workout system with video explanations', 'Custom nutrition plan', 'Cooking book for healthy meals', 'Follow-up every 7 days', '2 calls/month + 2 FREEZEs'],
          cta: 'Subscribe Now',
        },
      ],
    },
    featTransform: {
      eyebrow: 'Featured Transformation',
      name: 'Mohamed from Qatar 🇶🇦',
      duration: '12 Weeks',
      goal: 'Fat Loss & Muscle Gain',
      story: 'From ordinary to Super Saiyan in just 12 weeks. His transformation speaks for itself — a complete change in body composition that proves what commitment can achieve.',
      stats: [
        { value: '75→69kg', label: 'Weight' },
        { value: '22→11%', label: 'Body Fat' },
        { value: '12', label: 'Weeks' },
        { value: '×8', label: 'Power Level' },
      ],
      beforeLabel: 'Before',
      afterLabel: 'After',
    },
    gallery: {
      label: 'Client Results',
      headline: 'Proof, not promises.',
      beforeLabel: 'Before',
      afterLabel: 'After',
      clients: [
        { name: 'Bola', duration: '...', goal: 'Fat Loss', stats: ['Lost fat', 'Gained muscle'], beforeImg: images.before1, afterImg: images.after1 },
        { name: 'Talal — KSA 🇸🇦', duration: '...', goal: 'Full Transformation', stats: ['Best result of his life'], beforeImg: images.before2, afterImg: images.after2 },
        { name: 'Haidy', duration: '...', goal: 'Fat Loss', stats: ['Amazing results'], beforeImg: images.before3, afterImg: images.after3 },
        { name: 'Bilal Adel', duration: '4 Months', goal: 'Muscle Gain', stats: ['4 months only'], beforeImg: images.before4, afterImg: images.after4 },
        { name: 'Mohamed — Qatar 🇶🇦', duration: '12 Weeks', goal: 'Fat Loss', stats: ['75→69kg', '22→11% fat'], beforeImg: images.before5, afterImg: images.after5 },
        { name: 'Ahmed — Netherlands 🇳🇱', duration: '...', goal: 'Full Transformation', stats: ['Attention to detail'], beforeImg: images.before6, afterImg: images.after6 },
      ],
    },
    testimonials: {
      eyebrow: 'Client Words',
      headline: 'See what people who went before you say.',
      items: [
        { name: 'Bola', handle: 'Egypt', stars: 5, text: "I'm really happy with the result. My body got much leaner and I'm also gaining muscle. Very satisfied." },
        { name: 'Talal', handle: 'Saudi Arabia 🇸🇦', stars: 5, text: "Thank you so much. This is the best result I've ever achieved in my life, by the grace of God and then your help ❤️" },
        { name: 'Mostafa', handle: 'Qatar 🇶🇦', stars: 5, text: "My body literally transformed 180 degrees. I don't even know what to say, Joku my brother, seriously." },
        { name: 'Mohamed', handle: 'Egypt', stars: 5, text: "I really want to thank you. This is the first time in my life I've reached 8% body fat. You're amazing ❤" },
      ],
    },
    resources: {
      eyebrow: 'Coaching Tools',
      heading: 'More than just a workout plan.',
      sub: 'Every client gets access to a full suite of practical tools — not just an exercise list.',
      items: [
        { title: 'Calorie Counter', desc: 'Calculate your daily calorie needs accurately based on your body, goal, and activity level.' },
        { title: 'Food Comparison', desc: 'Compare different foods and choose what best fits your nutrition plan easily.' },
        { title: 'Cooking Book', desc: 'Healthy and delicious recipes to help you prepare your meals in different, quick, and simple ways.' },
        { title: 'Nutrition Tips', desc: 'Proven nutrition guidelines to help you achieve your health goals.' },
        { title: 'Power Level Tracker', desc: 'Track your training intensity, calculate your power level, and watch your progress toward Saiyan status.' },
        { title: 'Personal Follow-up', desc: 'Direct follow-up with Captain Joku to ensure your progress and adjust your plan based on results.' },
      ],
    },
    faq: {
      eyebrow: 'FAQ',
      headline: 'Questions most people ask before starting.',
      items: [
        { q: 'Is the follow-up with Captain Joku personally or through a specialized team?', a: 'The follow-up is with Captain Joku personally, not through a team. This is what makes the experience unique and personalized for you.' },
        { q: 'How long will it take to see results and reach my goal?', a: 'Results vary based on commitment and duration, but most clients see a noticeable difference within the first month with full commitment.' },
        { q: 'How many times should I train per week?', a: 'The program is designed based on your capabilities and schedule. Whether 3 days or 5 days, the program adapts to your life.' },
        { q: 'Are there options that fit different budgets for the nutrition plan?', a: 'Yes, the nutrition system is designed based on your capabilities and circumstances. No expensive or imported foods — everything is available and budget-friendly.' },
        { q: 'Does Captain Joku train women in online coaching?', a: 'Yes, training is available for both men and women. Programs are customized for each gender based on goals and needs.' },
        { q: 'How can I start and contact you?', a: 'Choose the right package, pay the subscription, and send proof of payment on WhatsApp. I will contact you within 24 hours to start your journey immediately.' },
      ],
    },
    cta: {
      eyebrow: 'Ready?',
      heading1: "Don't wait for perfect conditions —",
      headingAccent: 'create them',
      heading2: 'from here.',
      sub: 'Join the warriors community and write your own success story.',
      btn: 'Start Now',
      trust: 'Men & Women · Egypt & Worldwide · Personal follow-up with Captain Joku',
    },
    footer: {
      logo: 'JOKU',
      logoSub: 'SUPER SAIYAN',
      tagline: 'Let the hero inside you come out.',
      navGroups: [
        { heading: 'Quick Links', links: ['Home', 'About Captain Joku', 'Training Services', 'Transformations', 'Resources'] },
        { heading: 'Packages', links: ['GOHAN Package', 'VEGETA Package', 'JOKU Package'] },
        { heading: 'Contact', links: ['Start Now', 'WhatsApp', 'Instagram', 'Calorie Counter'] },
      ],
      copyright: '© 2026 Saiyan Fitness. All rights reserved.',
      lang: 'Language',
    },
  },

  ar: {
    nav: {
      logo: 'جوكو',
      tagline: 'كوتش',
      links: ['عن المدرب', 'المنهج', 'البرامج', 'النتائج', 'الأسعار'],
      cta: 'ابدأ الآن',
      lang: 'English',
    },
    hero: {
      eyebrow: 'سوبر سايان',
      headline: ['خلي البطل', 'اللي جواك يطلع'],
      sub: 'أفضل إستثمار يمكن أن تقوم به هو الإستثمار في صحتك',
      cta: 'ابدأ رحلتك',
      ctaSub: 'أماكن محدودة',
      scrollLabel: 'اكتشف',
    },
    trust: [
      { value: '+500', label: 'تحولات' },
      { value: '+5', label: 'سنوات خبرة' },
      { value: '+3', label: 'شهادة معتمدة' },
      { value: '4.9★', label: 'متوسط التقييم' },
      { value: '#1', label: 'فزيك مصر' },
    ],
    marquee: ['تدريب قائم على العلم', '+500 تحول', 'رجالة وبنات', 'تغذية مخصصة', 'مصر والعالم', 'تدريب أونلاين', 'إعادة تشكيل الجسم', 'برمجة قوة', 'نتائج حقيقية'],
    stats: [
      { number: 500, suffix: '+', label: 'تحولات ناجحة حول العالم' },
      { number: 5, suffix: '+', label: 'سنوات من الخبرة الاحترافية' },
      { number: 3, suffix: '+', label: 'شهادات معتمدة' },
      { number: 4.9, suffix: '★', label: 'متوسط تقييم العملاء', decimal: true },
    ],
    about: {
      eyebrow: 'المدرب',
      name: 'يوسف "جوكو"',
      title: 'المركز الأول فزيك مصر · شهادة تغذية رياضية',
      bio1: 'أعرفكم بنفسي اسمي يوسف والمعروف بلقب "جوكو" والسبب وراء ذلك حبي منذ طفولتي لأنمي دراغون بول Z متأثراً بالبطل غوكو بطل الإنمي المفضل لدي من صغري، حاصل على المركز الأول في فئة الفزيك في أول بطولة طبيعية تُلعب في مصر وحاصل على شهادة تغذية رياضية.',
      bio2: 'بخبرة تزيد عن 5 سنوات ومئات التحولات الناجحة، أملك من الحماس والطموح والعزيمة مما يجعلني أحب التعاون معكم للوصول إلى ما تتمنوه من تحقيق حياة صحية وبدنية رائعة حتى تغيروا أسلوب ونمط حياتكم للأفضل.',
      quote: 'كل بطل خارق تشاهده الآن كانت له بداية عادية. تحولك يبدأ اليوم.',
      certs: ['#1 فزيك مصر', 'تغذية رياضية معتمدة', '+5 سنوات خبرة', '+500 تحول ناجح'],
      imageAlt: 'كابتن جوكو',
    },
    why: {
      label: 'مهمتي ودورك القادم',
      headline: 'تجاوز حدودك وكن بطلاً.',
      items: [
        { title: 'تجاوز حدودك', desc: 'تحدى نفسك باستمرار والالتزام لتتجاوز قدراتك الحالية.' },
        { title: 'قائم على العلم والخبرة', desc: 'تعتمد البرامج التدريبية مع كابتن جوكو على مبادئ علمية مثبتة في التمارين والتغذية للوصول لهدفك.' },
        { title: 'مجتمع الأبطال', desc: 'انضم إلى مجتمع ملئ بالمحاربين الأبطال اللي قدروا يتغلبوا على أنفسهم في رحلتهم الخاصة بهم.' },
        { title: 'التواصل والتفاعل', desc: 'التدريب مع جوكو مختلف تماماً لأنه يتكون من العلم والخبرة والتفاهم والتشجيع يجعل موضوع التدريب معه مثيراً ومحفزاً.' },
        { title: 'نظام غذائي مخصص', desc: 'نظام غذائي مخصص حسب إمكانياتك وظروفك للوصول لهدفك بشكل مستدام ومناسب لميزانيتك.' },
        { title: 'متابعة مستمرة', desc: 'متابعة دورية لضمان التقدم وتعديل الخطة حسب نتائجك الفعلية.' },
      ],
    },
    forWho: {
      eyebrow: 'لمن هذا',
      heading: 'رجالة وبنات، جادون في التغيير.',
      items: [
        { label: 'المبتدئون', desc: 'البداية الصحيحة تمنع إعادة البداية إلى الأبد.' },
        { label: 'خسارة الدهون', desc: 'تقليل مستدام دون خسارة العضلات.' },
        { label: 'بناء العضلات', desc: 'ضخامة منظمة تتراكم فعلاً.' },
        { label: 'إعادة التشكيل', desc: 'أحرق الدهون وابنِ العضلات في آنٍ واحد.' },
        { label: 'رجالة وبنات', desc: 'التدريب متاح للجنسين بخطط مخصصة لكل منهما.' },
        { label: 'العملاء أونلاين', desc: 'تدريب احترافي من أي مكان في العالم.' },
        { label: 'من يحتاج محاسبة', desc: 'لمن يريد أكثر من مجرد خطة.' },
        { label: 'داخل وخارج مصر', desc: 'عملاء من مصر والسعودية وقطر وهولندا وروسيا وأكثر.' },
      ],
    },
    method: {
      eyebrow: 'كيفية الاشتراك والبدء',
      headline: 'خطوات بسيطة للبدء فوراً.',
      steps: [
        { num: '01', title: 'اختيار الباقة', body: 'اختر الباقة المناسبة لهدفك من بين باقاتي الثلاث.' },
        { num: '02', title: 'دفع الاشتراك', body: 'ادفع قيمة الاشتراك عبر الوسيلة المتاحة والأفضل لديك.' },
        { num: '03', title: 'تأكيد التحويل', body: 'أرسل screenshot لإثبات الدفع على واتساب.' },
        { num: '04', title: 'التواصل والبدء', body: 'أتواصل معك خلال 24 ساعة لجمع البيانات الخاصة بك ونبدأ رحلتك فوراً.' },
        { num: '05', title: 'خطة مخصصة', body: 'تحصل على نظام تمارين ونظام غذائي مخصص بالكامل لك حسب هدفك وظروفك.' },
        { num: '06', title: 'المتابعة الدورية', body: 'متابعة دورية حسب الباقة المختارة لضمان التقدم المستمر نحو هدفك.' },
      ],
    },
    services: {
      eyebrow: 'خطط الاشتراك',
      headline: 'ثلاث باقات. هدف واحد.',
      items: [
        { num: '01', title: 'باقة جوهان GOHAN', sub: 'الباقة العادية', desc: 'نظام تمارين + نظام غذائي مخصص + متابعة كل 15 يوم. الرد على أسئلتك خلال 24 إلى 72 ساعة.', cta: 'اشترك الآن', imageAlt: 'باقة جوهان' },
        { num: '02', title: 'باقة فيجيتا VEGETA', sub: 'الباقة المتوسطة', desc: 'نظام تمارين + نظام غذائي + كتاب الطبخ + متابعة كل 10 أيام. الرد يومياً وإمكانية FREEZE مرة واحدة.', cta: 'اشترك الآن', imageAlt: 'باقة فيجيتا' },
        { num: '03', title: 'باقة جوكو JOKU', sub: 'الباقة الخارقة', desc: 'نظام تمارين + نظام غذائي + كتاب الطبخ + متابعة كل 7 أيام + مكالمتين بالشهر. الرد يومياً وFREEZE مرتين.', cta: 'اشترك الآن', imageAlt: 'باقة جوكو' },
      ],
      pricingNote: 'النتائج بتختلف على قد الالتزام والمدة، كل ما كانت مدة اشتراكك أطول والتزامك أعلى كل ما النتائج أقوى.',
      tiers: [
        {
          name: 'جوهان GOHAN',
          price: '650',
          period: 'جنيه/شهر',
          highlight: false,
          features: ['نظام تمارين مشروح بالفيديوهات', 'نظام غذائي مخصص لك حسب إمكانياتك', 'متابعة كل 15 يوم', 'الرد على أسئلتك خلال 24-72 ساعة'],
          cta: 'اشترك الآن',
        },
        {
          name: 'فيجيتا VEGETA',
          price: '1,000',
          period: 'جنيه/شهر',
          highlight: true,
          badge: 'الأكثر مبيعًا',
          features: ['نظام تمارين مشروح بالفيديوهات', 'نظام غذائي مخصص لك حسب إمكانياتك', 'كتاب الطبخ للوجبات الصحية', 'متابعة كل 10 أيام', 'الرد يومياً + FREEZE مرة واحدة'],
          cta: 'اشترك الآن',
        },
        {
          name: 'جوكو JOKU',
          price: '1,500',
          period: 'جنيه/شهر',
          highlight: false,
          features: ['نظام تمارين مشروح بالفيديوهات', 'نظام غذائي مخصص لك حسب إمكانياتك', 'كتاب الطبخ للوجبات الصحية', 'متابعة كل 7 أيام', 'مكالمتين بالشهر + FREEZE مرتين'],
          cta: 'اشترك الآن',
        },
      ],
    },
    featTransform: {
      eyebrow: 'التحول المميز',
      name: 'محمد من قطر 🇶🇦',
      duration: '12 أسبوع',
      goal: 'حرق دهون وبناء عضلات',
      story: 'من العادي إلى السايان الخارق في 12 أسبوعاً فقط. قوة تحوله تتحدث عن نفسها — تغيير كامل في تركيبة الجسم يثبت ما يمكن أن يحققه الالتزام.',
      stats: [
        { value: '75←69كجم', label: 'الوزن' },
        { value: '22←11%', label: 'نسبة الدهون' },
        { value: '12', label: 'أسبوع' },
        { value: '×8', label: 'مستوى القوة' },
      ],
      beforeLabel: 'قبل',
      afterLabel: 'بعد',
    },
    gallery: {
      label: 'نتائج العملاء',
      headline: 'دليل، لا وعود.',
      beforeLabel: 'قبل',
      afterLabel: 'بعد',
      clients: [
        { name: 'بولا', duration: '...', goal: 'إنقاص الوزن', stats: ['نشف جسمي كتير', 'زيادة عضل'], beforeImg: images.before1, afterImg: images.after1 },
        { name: 'طلال من السعودية 🇸🇦', duration: '...', goal: 'تحول كامل', stats: ['أفضل نتيجة في حياتي'], beforeImg: images.before2, afterImg: images.after2 },
        { name: 'هايدي', duration: '...', goal: 'إنقاص الوزن', stats: ['نتائج رائعة'], beforeImg: images.before3, afterImg: images.after3 },
        { name: 'بلال عادل', duration: '4 شهور', goal: 'بناء العضلات', stats: ['شغل 4 شهور بس'], beforeImg: images.before4, afterImg: images.after4 },
        { name: 'محمد من قطر 🇶🇦', duration: '12 أسبوع', goal: 'حرق دهون', stats: ['75←69كجم', '22←11% دهون'], beforeImg: images.before5, afterImg: images.after5 },
        { name: 'أحمد من هولندا 🇳🇱', duration: '...', goal: 'تحول كامل', stats: ['اهتمام بأدق التفاصيل'], beforeImg: images.before6, afterImg: images.after6 },
      ],
    },
    testimonials: {
      eyebrow: 'كلمات العملاء',
      headline: 'شوف آراء الناس اللي سبقوك عشان تتحمس.',
      items: [
        { name: 'بولا', handle: 'مصر', stars: 5, text: 'انا الحمدلله بجد مبسوط من النتيجة جسمي نشف كتير وكمان بزيد عضل مبسوط جدًا.' },
        { name: 'طلال', handle: 'السعودية 🇸🇦', stars: 5, text: 'شكرًا جدًا لك، هذه أفضل نتيجة وصلت لها بحياتي بفضل الله ثم فضلك ❤️' },
        { name: 'مصطفى', handle: 'قطر 🇶🇦', stars: 5, text: 'بجد جسمي اتحول 180 درجه بجد الحمد لله مش عارف أقولك ايه يا جوكو حبيبي بجد.' },
        { name: 'محمد', handle: 'مصر', stars: 5, text: 'بجد عايز اشكرك انا اول مرة في حياتي اوصل 8% body fat انت شاطر أوي والله ❤' },
      ],
    },
    resources: {
      eyebrow: 'أدوات التدريب',
      heading: 'أكثر من مجرد خطة تمارين.',
      sub: 'كل عميل يحصل على مجموعة كاملة من الأدوات العملية — ليس مجرد قائمة تمارين.',
      items: [
        { title: 'عداد السعرات الحرارية', desc: 'احسب احتياجاتك اليومية من السعرات بدقة حسب جسمك وهدفك ومستوى نشاطك.' },
        { title: 'مقارنة الأطعمة الغذائية', desc: 'قارن بين الأطعمة المختلفة واختر الأفضل لخطتك الغذائية بسهولة.' },
        { title: 'كتاب الطبخ الصحي', desc: 'وصفات صحية ولذيذة تساعدك في تحضير وجباتك بطرق مختلفة وسريعة وبسيطة.' },
        { title: 'نصائح التغذية', desc: 'توجيهات غذائية علمية مثبتة لمساعدتك على تحقيق أهدافك الصحية.' },
        { title: 'مستوى القوة', desc: 'تتبع شدة تدريبك واحسب مستوى قوتك وشاهد تقدمك نحو مستوى السايان.' },
        { title: 'متابعة شخصية', desc: 'متابعة مباشرة مع كابتن جوكو لضمان تقدمك وتعديل خطتك حسب نتائجك.' },
      ],
    },
    faq: {
      eyebrow: 'الأسئلة الشائعة',
      headline: 'أسئلة يطرحها معظم الناس قبل البدء.',
      items: [
        { q: 'هل المتابعة بتكون مع كابتن جوكو شخصياً أم بتكون عن طريق فريق متخصص؟', a: 'المتابعة تكون مع كابتن جوكو شخصياً، وليس عن طريق فريق. هذا ما يجعل التجربة مميزة ومخصصة لك.' },
        { q: 'كم من الوقت سأحتاج لرؤية النتائج والوصول لهدفي؟', a: 'النتائج بتختلف على قد الالتزام والمدة، لكن معظم العملاء يشاهدون فرقاً واضحاً خلال أول شهر مع الالتزام الكامل.' },
        { q: 'كم مرة يجب أن أتدرب خلال الأسبوع؟', a: 'البرنامج يُصمم حسب إمكانياتك وجدولك. سواء كان 3 أيام أو 5 أيام، البرنامج يتكيف مع حياتك.' },
        { q: 'هل يوجد خيارات تتناسب الميزانيات المختلفة بالنسبة للنظام الغذائي مع كابتن جوكو عند الاشتراك معه؟', a: 'نعم، النظام الغذائي يُصمم حسب إمكانياتك وظروفك. لا يوجد أطعمة مستوردة أو مكلفة، كل شيء متاح ومناسب لميزانيتك.' },
        { q: 'هل كابتن جوكو بيمرن بنات في تدريب الأون لاين؟', a: 'نعم، التدريب متاح للرجال والنساء. البرامج مصممة بشكل مخصص لكل جنس حسب الهدف والاحتياجات.' },
        { q: 'كيف يمكنني البدء والتواصل معك؟', a: 'اختر الباقة المناسبة لك، ادفع الاشتراك، وأرسل إثبات الدفع على واتساب. سأتواصل معك خلال 24 ساعة لنبدأ رحلتك فوراً.' },
      ],
    },
    cta: {
      eyebrow: 'مستعد؟',
      heading1: 'لا تنتظر الظروف المثالية',
      headingAccent: 'اصنعها',
      heading2: 'من هنا.',
      sub: 'انضم إلى مجتمع المحاربين واكتب قصتك الناجحة الخاصة.',
      btn: 'ابدأ الآن',
      trust: 'رجالة وبنات · داخل وخارج مصر · متابعة شخصية مع كابتن جوكو',
    },
    footer: {
      logo: 'جوكو',
      logoSub: 'سوبر سايان',
      tagline: 'خلي البطل اللي جواك يطلع.',
      navGroups: [
        { heading: 'روابط سريعة', links: ['الرئيسية', 'عن كابتن جوكو', 'خدمات التدريب', 'التحولات', 'موارد التدريب'] },
        { heading: 'الباقات', links: ['جوهان GOHAN', 'فيجيتا VEGETA', 'جوكو JOKU'] },
        { heading: 'تواصل معي', links: ['ابدأ الآن', 'واتساب', 'إنستغرام', 'عداد السعرات'] },
      ],
      copyright: '© 2026 لياقة السايان الخارق. جميع الحقوق محفوظة.',
      lang: 'اللغة',
    },
  },
};

// ─── BEFORE/AFTER SLIDER ─────────────────────────────────────
function BeforeAfterSlider({ beforeSrc, afterSrc, beforeLabel, afterLabel, className = '' }) {
  const containerRef = useRef(null);
  const [pos, setPos] = useState(50);
  const dragging = useRef(false);

  const clamp = v => Math.max(0, Math.min(100, v));

  const updatePos = useCallback(clientX => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPos(clamp(((clientX - rect.left) / rect.width) * 100));
  }, []);

  useEffect(() => {
    const onMove = e => {
      if (dragging.current) updatePos(e.touches ? e.touches[0].clientX : e.clientX);
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [updatePos]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden select-none cursor-col-resize ${className}`}
      onMouseDown={e => {
        dragging.current = true;
        updatePos(e.clientX);
      }}
      onTouchStart={e => {
        dragging.current = true;
        updatePos(e.touches[0].clientX);
      }}>
      <img src={afterSrc} alt={afterLabel} className='w-full h-full object-cover block' draggable={false} />
      <div className='absolute inset-0 overflow-hidden' style={{ width: `${pos}%` }}>
        <img src={beforeSrc} alt={beforeLabel} className='absolute inset-0 w-full h-full object-cover block' style={{ width: `${100 / (pos / 100)}%`, maxWidth: 'none' }} draggable={false} />
      </div>
      <span className='absolute top-3 start-3 bg-black/70 text-white text-[10px]  font-[600] tracking-[0.2em] uppercase px-2 py-1 pointer-events-none'>{beforeLabel}</span>
      <span className='absolute top-3 end-3 bg-orange-600/90 text-white text-[10px]  font-[600] tracking-[0.2em] uppercase px-2 py-1 pointer-events-none'>{afterLabel}</span>
      <div className='absolute inset-y-0 w-px bg-white/90' style={{ left: `${pos}%` }}>
        <div className='absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white shadow-xl flex items-center justify-center'>
          <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
            <path d='M5 8H1M1 8L3 6M1 8L3 10M11 8H15M15 8L13 6M15 8L13 10' stroke='#111' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── ACCORDION ITEM (FAQ) ─────────────────────────────────────
function AccordionItem({ q, a, index, open, onToggle }) {
  return (
    <div className='border-b border-stone-200'>
      <button className='w-full flex items-start justify-between gap-6 py-5 text-start' onClick={onToggle} aria-expanded={open}>
        <span className='text-xs font-body text-stone-400 font-medium tracking-widest pt-0.5'>{String(index + 1).padStart(2, '0')}</span>
        <span className='flex-1 text-base  font-semibold text-stone-900 md: leading-snug'>{q}</span>
        <span className={`mt-1 flex-shrink-0 w-5 h-5 border border-stone-400 rounded-full flex items-center justify-center transition-transform duration-300 ${open ? 'rotate-45 bg-orange-600 border-orange-600' : ''}`}>
          <svg width='10' height='10' viewBox='0 0 10 10' fill='none'>
            <line x1='5' y1='0' x2='5' y2='10' stroke={open ? 'white' : '#6b7280'} strokeWidth='1.5' />
            <line x1='0' y1='5' x2='10' y2='5' stroke={open ? 'white' : '#6b7280'} strokeWidth='1.5' />
          </svg>
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
        <p className='pb-5 ps-7 font-body text-stone-600 md: leading-relaxed text-[15px]'>{a}</p>
      </div>
    </div>
  );
}

// ─── STAR ICON ───────────────────────────────────────────────
function StarIcon() {
  return (
    <svg width='13' height='13' viewBox='0 0 14 14' fill='#ea580c' xmlns='http://www.w3.org/2000/svg'>
      <path d='M7 1l1.545 4.753H13.18l-3.877 2.817L10.848 13 7 10.182 3.152 13l1.545-4.43L.82 5.753H5.455z' />
    </svg>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────
export default function CoachLandingPage() {
  const locale = useLocale();
  const t = content[locale] || content.en;
  const isAr = locale === 'ar';

  const heroRef = useRef(null);
  const heroImgRef = useRef(null);
  const heroHeadRef = useRef(null);
  const heroCtaRef = useRef(null);
  const statsRef = useRef(null);
  const statNumRefs = useRef([]);
  const marqueeRef = useRef(null);

  const [navScrolled, setNavScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  // nav scroll
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    return () => {};
  }, [locale]);

  const marqueeItems = [...t.marquee, ...t.marquee, ...t.marquee];
  const sectionIds = ['about', 'method', 'programs', 'results', 'pricing'];

  return (
    <div className='bg-stone-50 text-stone-900 font-body overflow-x-hidden'>
      {/* ══════════════════════════════════════
          NAV
      ══════════════════════════════════════ */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${navScrolled ? 'bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-sm' : 'bg-transparent'}`}>
        <div className='max-w-7xl mx-auto px-5 lg:px-10 h-16 flex items-center justify-between gap-6'>
          <a href='#' className='flex items-center gap-2 shrink-0'>
            <span className='w-7 h-7 bg-orange-600 flex items-center justify-center'>
              <svg width='14' height='14' viewBox='0 0 14 14' fill='none'>
                <path d='M7 1L2 13h10L7 1z'  />
              </svg>
            </span>
            <span className={` font-[600] text-lg tracking-tight transition-colors duration-300 ${navScrolled ? 'text-stone-900' : 'text-white'}`}>{t.nav.logo}</span>
            <span className={`hidden sm:block text-xs font-body tracking-widest uppercase mt-0.5 transition-colors duration-300 ${navScrolled ? 'text-stone-400' : 'text-white/60'}`}>{t.nav.tagline}</span>
          </a>

          <nav className='hidden lg:flex items-center gap-7'>
            {t.nav.links.map((l, i) => (
              <a key={i} href={`#${sectionIds[i]}`} className={`text-sm font-body hover:text-orange-500 transition-colors tracking-wide ${navScrolled ? 'text-stone-600' : 'text-white/85'}`}>
                {l}
              </a>
            ))}
          </nav>

          <div className='flex items-center gap-3'>
            <a href={`/${isAr ? 'en' : 'ar'}`} className={`hidden sm:block text-xs font-body font-semibold tracking-widest uppercase transition-colors hover:text-orange-500 ${navScrolled ? 'text-stone-500' : 'text-white/70'}`}>
              {t.nav.lang}
            </a>
            <a href='#pricing' className='hidden sm:block text-sm font-body font-semibold bg-orange-600 text-white px-5 py-2.5 hover:bg-orange-700 transition-colors'>
              {t.nav.cta}
            </a>
            <button onClick={() => setMobileOpen(true)} className='lg:hidden w-9 h-9 flex flex-col justify-center gap-1.5 items-end' aria-label='Open menu'>
              <span className={`w-6 h-px block transition-colors duration-300 ${navScrolled ? 'bg-stone-900' : 'bg-white'}`} />
              <span className={`w-4 h-px block transition-colors duration-300 ${navScrolled ? 'bg-stone-900' : 'bg-white'}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className='fixed inset-0 z-[100] flex'>
          <div className='absolute inset-0 bg-black/40' onClick={() => setMobileOpen(false)} />
          <div className='relative ms-auto w-72 bg-white h-full flex flex-col p-8 pt-16 shadow-xl'>
            <button onClick={() => setMobileOpen(false)} className='absolute top-5 end-5 w-8 h-8 flex items-center justify-center' aria-label='Close'>
              <svg width='14' height='14' viewBox='0 0 14 14' fill='none'>
                <path d='M1 1l12 12M13 1L1 13' stroke='#111' strokeWidth='1.5' strokeLinecap='round' />
              </svg>
            </button>
            <div className='flex flex-col gap-6 mt-4'>
              {t.nav.links.map((l, i) => (
                <a key={i} href={`#${sectionIds[i]}`} onClick={() => setMobileOpen(false)} className=' text-xl font-[600] text-stone-900 hover:text-orange-600'>
                  {l}
                </a>
              ))}
            </div>
            <div className='mt-auto flex flex-col gap-3'>
              <a href='#pricing' onClick={() => setMobileOpen(false)} className='block w-full text-center bg-orange-600 text-white font-body font-semibold py-3 text-sm'>
                {t.nav.cta}
              </a>
              <a href={`/${isAr ? 'en' : 'ar'}`} className='block w-full text-center text-xs font-body font-semibold text-stone-500 tracking-widest uppercase'>
                {t.nav.lang}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          01 HERO
      ══════════════════════════════════════ */}
      <section ref={heroRef} id='hero' className='relative min-h-screen flex items-center pt-24 pb-16 bg-stone-900 overflow-hidden'>
        <div className='absolute inset-0'>
          <img ref={heroImgRef} src={images.hero} alt='' className='w-full h-full object-cover object-top opacity-30' />
          <div className='absolute inset-0 bg-gradient-to-b from-stone-900/60 via-stone-900/40 to-stone-900/90' />
        </div>

        <div className='relative max-w-7xl mx-auto px-5 md:px-10 w-full'>
          <div ref={heroHeadRef}>
            <p className='headline-line text-xs font-body font-semibold tracking-[0.25em] uppercase text-orange-500 mb-6 flex items-center gap-3'>
              <span className='w-8 h-px bg-orange-500' />
              {t.hero.eyebrow}
            </p>
            <h1 className=' font-[600] text-[clamp(3rem,9vw,8rem)] md: leading-[0.92] tracking-tight text-white mb-8'>
              {t.hero.headline.map((line, i) => (
                <span key={i} className='headline-line block'>
                  {line}
                </span>
              ))}
            </h1>
          </div>
          <div ref={heroCtaRef}>
            <p className='font-body text-base md:text-xl text-stone-300 max-w-xl md: leading-relaxed mb-10'>{t.hero.sub}</p>
            <div className='flex flex-wrap items-center gap-5'>
              <a href='#pricing' className='inline-flex items-center gap-3 bg-orange-600 hover:bg-orange-700 text-white font-body text-sm tracking-wide px-8 py-4 transition-colors'>
                {t.hero.cta}
                <svg width='14' height='14' viewBox='0 0 14 14' fill='none' className='rtl:-scale-x-100'>
                  <path d='M2 7h10M8 3l4 4-4 4' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
                </svg>
              </a>
              <span className='font-body text-xs text-stone-400 tracking-wide'>{t.hero.ctaSub}</span>
            </div>
          </div>
          <div className='absolute bottom-8 start-5 md:start-10 flex items-center gap-3'>
            <div className='w-px h-12 bg-white/20 relative overflow-hidden'>
              <div className='absolute top-0 w-full h-1/2 bg-white/60 animate-bounce' />
            </div>
           </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          02 TRUST BAR
      ══════════════════════════════════════ */}
      <section className='bg-white border-b border-stone-200'>
        <div className='max-w-7xl mx-auto px-5 md:px-10 py-5 flex flex-wrap justify-between gap-6'>
          {t.trust.map((item, i) => (
            <div key={i} className='flex flex-col items-center text-center min-w-[70px]'>
              <span className=' font-[600] text-xl text-stone-900'>{item.value}</span>
              <span className='font-body text-xs text-stone-400 tracking-wide mt-0.5 uppercase'>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════
          03 MARQUEE
      ══════════════════════════════════════ */}
      <section ref={marqueeRef} className='bg-orange-600 py-4 overflow-hidden' aria-hidden='true'>
        <div className='marquee-inner flex gap-0 whitespace-nowrap will-change-transform'>
          {marqueeItems.map((item, i) => (
            <span key={i} className=' text-sm tracking-[0.15em] uppercase text-white/90 px-8 flex items-center gap-8'>
              {item}
              <span className='w-1.5 h-1.5 rounded-full bg-white/40 shrink-0' />
            </span>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════
          04 BY THE NUMBERS
      ══════════════════════════════════════ */}
      <section ref={statsRef} className='bg-stone-50 border-b border-stone-200'>
        <div className='max-w-7xl mx-auto px-5 md:px-10 py-6'>
          <p className='text-xs tracking-[0.3em] uppercase text-orange-600 font-body mb-10 gsap-reveal'>By the numbers</p>
        </div>
        <div className='max-w-7xl mx-auto px-5 md:px-10 pb-24'>
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-0 border border-stone-200'>
            {t.stats.map((s, i) => (
              <div key={i} className={`p-8 sm:p-12 flex flex-col gap-3 relative ${i < 3 ? 'border-e border-stone-200 rtl:border-e-0 rtl:border-s' : ''} ${i >= 2 ? 'border-t border-stone-200 lg:border-t-0' : ''}`}>
                <div className=' font-[600] text-[clamp(44px,5.5vw,72px)] md: leading-none text-stone-900 tracking-tighter flex items-end gap-1'>
                  <span ref={el => (statNumRefs.current[i] = el)}>{s.decimal ? s.number.toFixed(1) : s.number}</span>
                  <span className='text-orange-600 text-3xl pb-1'>{s.suffix}</span>
                </div>
                <p className='text-[13px] font-body text-stone-500 md: leading-snug max-w-[160px]'>{s.label}</p>
                <span className='absolute bottom-3 end-4  text-6xl text-stone-100 md: leading-none select-none pointer-events-none'>0{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          05 ABOUT
      ══════════════════════════════════════ */}
      <section id='about' className='py-24 md:py-32 bg-white border-b border-stone-100'>
        <div className='max-w-7xl mx-auto px-5 md:px-10 grid lg:grid-cols-2 gap-16 lg:gap-24 items-center'>
          <div className='relative gsap-reveal'>
            <div className='aspect-[3/4] overflow-hidden'>
              <img src={images.about} alt={t.about.imageAlt} className='w-full h-full object-cover' />
            </div>
            <div className='absolute -bottom-6 -end-6 bg-orange-600 text-white p-6 hidden lg:block'>
              <p className=' font-[600] text-3xl md: leading-none'>5+</p>
              <p className='font-body text-xs tracking-wide mt-1'>{isAr ? 'سنوات' : 'Years'}</p>
            </div>
          </div>
          <div className='gsap-reveal'>
            <p className='text-xs font-body font-semibold tracking-[0.2em] uppercase text-orange-600 mb-4'>{t.about.eyebrow}</p>
            <h2 className=' font-[600] text-4xl lg:text-5xl text-stone-900 md: leading-tight mb-2'>{t.about.name}</h2>
            <p className='font-body text-sm text-stone-400 tracking-wide mb-8'>{t.about.title}</p>
            <p className='font-body text-stone-600 text-base md: leading-relaxed mb-5'>{t.about.bio1}</p>
            <p className='font-body text-stone-600 text-base md: leading-relaxed mb-8'>{t.about.bio2}</p>
            <blockquote className='border-s-2 border-orange-600 ps-5 mb-8'>
              <p className='font-body text-stone-700 text-base italic md: leading-relaxed'>"{t.about.quote}"</p>
            </blockquote>
            <div className='flex flex-wrap gap-2'>
              {t.about.certs.map((tag, i) => (
                <span key={i} className='text-xs font-body font-semibold tracking-widest uppercase border border-stone-200 px-3 py-1.5 text-stone-600'>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          06 WHY (dark)
      ══════════════════════════════════════ */}
      <section className='py-24 md:py-32 bg-stone-900 text-white border-b border-stone-800'>
        <div className='max-w-7xl mx-auto px-5 md:px-10'>
          <div className='grid lg:grid-cols-[1fr_2fr] gap-16 items-start'>
            <div className='gsap-reveal'>
              <p className='text-xs font-body font-semibold tracking-[0.2em] uppercase text-orange-500 mb-4'>{t.why.label}</p>
              <h2 className=' font-[600] text-4xl lg:text-5xl md: leading-tight'>{t.why.headline}</h2>
            </div>
            <div className='gsap-stagger grid sm:grid-cols-2 gap-px bg-stone-700'>
              {t.why.items.map((item, i) => (
                <div key={i} className='gsap-stagger-item bg-stone-900 p-7'>
                  <p className='text-xs font-body font-semibold tracking-[0.2em] uppercase text-stone-500 mb-3'>0{i + 1}</p>
                  <h3 className=' font-[600] text-lg text-white mb-2'>{item.title}</h3>
                  <p className='font-body text-sm text-stone-400 md: leading-relaxed'>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          07 WHO THIS IS FOR (light)
      ══════════════════════════════════════ */}
      <section className='py-24 md:py-32 bg-stone-50 border-b border-stone-200'>
        <div className='max-w-7xl mx-auto px-5 md:px-10'>
          <div className='mb-14 gsap-reveal'>
            <p className='text-xs font-body font-semibold tracking-[0.2em] uppercase text-orange-600 mb-4'>{t.forWho.eyebrow}</p>
            <h2 className=' font-[600] text-4xl lg:text-5xl text-stone-900 md: leading-tight max-w-xl'>{t.forWho.heading}</h2>
          </div>
          <div className='gsap-stagger grid grid-cols-2 sm:grid-cols-4 gap-0 border border-stone-200 bg-stone-200'>
            {t.forWho.items.map((item, i) => (
              <div key={i} className='gsap-stagger-item bg-stone-50 p-6 hover:bg-white transition-colors duration-200 group'>
                <div className='w-8 h-px bg-orange-600 mb-4 group-hover:w-12 transition-all duration-300' />
                <h3 className=' font-[600] text-base text-stone-900 group-hover:text-orange-600 transition-colors mb-2'>{item.label}</h3>
                <p className='font-body text-xs text-stone-400 md: leading-relaxed'>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          08 METHOD (dark)
      ══════════════════════════════════════ */}
      <section id='method' className='py-24 md:py-32 bg-stone-900 text-white border-b border-stone-800'>
        <div className='max-w-7xl mx-auto px-5 md:px-10'>
          <div className='mb-16 gsap-reveal'>
            <p className='text-xs font-body font-semibold tracking-[0.2em] uppercase text-orange-500 mb-4'>{t.method.eyebrow}</p>
            <h2 className=' font-[600] text-4xl lg:text-5xl text-white md: leading-tight'>{t.method.headline}</h2>
          </div>
          <div className='gsap-stagger grid md:grid-cols-2 lg:grid-cols-3 gap-0'>
            {t.method.steps.map((step, i) => (
              <div key={i} className='gsap-stagger-item relative border-t border-stone-700 p-8 lg:p-10 group hover:bg-stone-800 transition-colors'>
                <span className=' font-[600] text-[64px] md: leading-none text-stone-800 group-hover:text-orange-900/30 select-none absolute top-4 end-6 transition-colors'>{step.num}</span>
                <div className='relative z-10'>
                  <span className='text-xs font-body text-orange-500 font-[600] tracking-widest mb-3 block'>{step.num}</span>
                  <h3 className=' font-[600] text-xl text-white mb-3'>{step.title}</h3>
                  <p className='text-[14px] font-body text-stone-400 md: leading-relaxed'>{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          09 SERVICES + PRICING (light)
      ══════════════════════════════════════ */}
      <section id='programs' className='py-24 md:py-32 bg-stone-50 border-b border-stone-200'>
        <div className='max-w-7xl mx-auto px-5 md:px-10'>
          <div className='mb-16 gsap-reveal'>
            <p className='text-xs font-body font-semibold tracking-[0.2em] uppercase text-orange-600 mb-4'>{t.services.eyebrow}</p>
            <h2 className=' font-[600] text-4xl lg:text-5xl text-stone-900 md: leading-tight'>{t.services.headline}</h2>
          </div>

          {/* Service bento */}
          <div className='grid lg:grid-cols-[1.4fr_1fr] gap-5 mb-16'>
            <div className='relative group overflow-hidden bg-stone-900 text-white flex flex-col gsap-reveal'>
              <div className='h-64 lg:h-80 overflow-hidden'>
                <img src={images.service1} alt={t.services.items[0].imageAlt} className='w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700 ease-out' />
              </div>
              <div className='p-8 flex-1 flex flex-col'>
                <p className='text-xs font-body font-semibold tracking-[0.2em] uppercase text-stone-400 mb-2'>
                  {t.services.items[0].num} — {t.services.items[0].sub}
                </p>
                <h3 className=' font-[600] text-3xl mb-3'>{t.services.items[0].title}</h3>
                <p className='font-body text-sm text-stone-300 md: leading-relaxed flex-1'>{t.services.items[0].desc}</p>
                <a href='#pricing' className='mt-6 inline-flex items-center gap-2 text-sm font-body font-semibold text-orange-500 hover:text-orange-400 transition-colors'>
                  {t.services.items[0].cta}
                  <svg width='14' height='14' viewBox='0 0 14 14' fill='none' className='rtl:-scale-x-100'>
                    <path d='M2 7h10M8 3l4 4-4 4' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
                  </svg>
                </a>
              </div>
            </div>

            <div className='flex flex-col gap-5'>
              {[1, 2].map(idx => (
                <div key={idx} className='relative group overflow-hidden bg-white border border-stone-200 flex flex-col gsap-reveal'>
                  <div className='h-44 overflow-hidden'>
                    <img src={idx === 1 ? images.service2 : images.service3} alt={t.services.items[idx].imageAlt} className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out' />
                  </div>
                  <div className='p-6'>
                    <p className='text-xs font-body font-semibold tracking-[0.2em] uppercase text-stone-400 mb-1'>
                      {t.services.items[idx].num} — {t.services.items[idx].sub}
                    </p>
                    <h3 className=' font-[600] text-xl text-stone-900 mb-2'>{t.services.items[idx].title}</h3>
                    <p className='font-body text-sm text-stone-500 md: leading-relaxed mb-4'>{t.services.items[idx].desc}</p>
                    <a href='#pricing' className='inline-flex items-center gap-2 text-xs font-body font-semibold text-stone-900 hover:text-orange-600 transition-colors'>
                      {t.services.items[idx].cta}
                      <svg width='12' height='12' viewBox='0 0 14 14' fill='none' className='rtl:-scale-x-100'>
                        <path d='M2 7h10M8 3l4 4-4 4' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
                      </svg>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing tiers */}
          <div id='pricing' className='pt-8 border-t border-stone-200'>
            <p className='text-xs font-body font-semibold tracking-[0.2em] uppercase text-orange-600 mb-2 gsap-reveal'>{isAr ? 'الاشتراك' : 'Investment'}</p>
            <p className='font-body text-sm text-stone-500 mb-10 gsap-reveal'>{t.services.pricingNote}</p>
            <div className='gsap-stagger grid md:grid-cols-3 gap-4 items-start'>
              {t.services.tiers.map((tier, i) => (
                <div key={i} className={`gsap-stagger-item flex flex-col ${tier.highlight ? 'bg-stone-900 text-white md:-mt-4 md:pb-4' : 'bg-white border border-stone-200'}`}>
                  <div className={`h-8 flex items-center justify-center ${tier.highlight ? 'bg-orange-600' : 'bg-transparent'}`}>{tier.badge && <span className='text-[10px] font-body font-[600] tracking-[0.2em] uppercase text-white'>{tier.badge}</span>}</div>
                  <div className='p-8 flex flex-col flex-1 gap-5'>
                    <div>
                      <h3 className={` font-[600] text-lg mb-4 ${tier.highlight ? 'text-white' : 'text-stone-900'}`}>{tier.name}</h3>
                      <div className='flex items-baseline gap-1'>
                        <span className={` font-[600] text-[48px] md: leading-none tracking-tighter ${tier.highlight ? 'text-white' : 'text-stone-900'}`}>{tier.price}</span>
                        <span className={`font-body text-sm ${tier.highlight ? 'text-stone-400' : 'text-stone-500'}`}>{tier.period}</span>
                      </div>
                    </div>
                    <ul className='flex flex-col gap-3 flex-1'>
                      {tier.features.map((f, fi) => (
                        <li key={fi} className='flex items-start gap-3'>
                          <span className='text-orange-500 flex-shrink-0 mt-0.5'>✓</span>
                          <span className={`text-[13px] font-body md: leading-snug ${tier.highlight ? 'text-stone-300' : 'text-stone-600'}`}>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <a href='#' className={`block text-center py-3.5  font-[600] text-[13px] tracking-wide uppercase transition-colors ${tier.highlight ? 'bg-orange-600 text-white hover:bg-white hover:text-stone-900' : 'border border-stone-300 text-stone-900 hover:bg-stone-900 hover:text-white hover:border-stone-900'}`}>
                      {tier.cta}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          10 FEATURED TRANSFORMATION (dark)
      ══════════════════════════════════════ */}
      <section id='results' className='py-24 md:py-32 bg-stone-900 text-white border-b border-stone-800'>
        <div className='max-w-7xl mx-auto px-5 md:px-10'>
          <p className='text-xs font-body font-semibold tracking-[0.2em] uppercase text-orange-500 mb-4 gsap-reveal'>{t.featTransform.eyebrow}</p>
          <div className='grid lg:grid-cols-2 gap-12 lg:gap-20 items-center'>
            <div className='gsap-reveal'>
              <BeforeAfterSlider beforeSrc={images.transformFeatBefore} afterSrc={images.transformFeatAfter} beforeLabel={t.featTransform.beforeLabel} afterLabel={t.featTransform.afterLabel} className='aspect-[3/4]' />
            </div>
            <div className='space-y-8 gsap-reveal'>
              <div>
                <h2 className=' font-[600] text-4xl lg:text-5xl md: leading-none mb-1'>{t.featTransform.name}</h2>
                <p className='text-stone-400 font-body text-sm tracking-wide'>
                  {t.featTransform.duration} · {t.featTransform.goal}
                </p>
              </div>
              <p className='font-body text-stone-300 md: leading-relaxed'>{t.featTransform.story}</p>
              <div className='grid grid-cols-2 gap-0 border border-stone-700'>
                {t.featTransform.stats.map((s, i) => (
                  <div key={i} className={`p-5 ${i < 3 ? 'border-e border-stone-700 rtl:border-e-0 rtl:border-s' : ''} ${i < 2 ? 'border-b border-stone-700' : ''}`}>
                    <p className=' font-[600] text-2xl text-orange-500 md: leading-none'>{s.value}</p>
                    <p className='text-xs text-stone-500 font-body tracking-wide mt-1'>{s.label}</p>
                  </div>
                ))}
              </div>
              <a href='#pricing' className='inline-block bg-orange-600 text-white font-body text-sm tracking-wide px-8 py-4 hover:bg-orange-700 transition-colors'>
                {t.nav.cta}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          11 CLIENT RESULTS GALLERY (light)
      ══════════════════════════════════════ */}
      <section className='py-24 md:py-32 bg-stone-50 border-b border-stone-200'>
        <div className='max-w-7xl mx-auto px-5 md:px-10'>
          <div className='mb-14 gsap-reveal'>
            <p className='text-xs font-body font-semibold tracking-[0.2em] uppercase text-orange-600 mb-4'>{t.gallery.label}</p>
            <h2 className=' font-[600] text-4xl lg:text-5xl text-stone-900 md: leading-tight'>{t.gallery.headline}</h2>
          </div>
          <div className='gsap-stagger grid sm:grid-cols-2 lg:grid-cols-3 gap-5'>
            {t.gallery.clients.map((client, i) => (
              <div key={i} className='gsap-stagger-item bg-white overflow-hidden border border-stone-100'>
                <div className='aspect-[3/4] overflow-hidden'>
                  <BeforeAfterSlider beforeSrc={client.beforeImg} afterSrc={client.afterImg} beforeLabel={t.gallery.beforeLabel} afterLabel={t.gallery.afterLabel} />
                </div>
                <div className='p-5'>
                  <div className='flex justify-between items-start mb-3'>
                    <div>
                      <p className=' font-[600] text-base text-stone-900'>{client.name}</p>
                      <p className='font-body text-xs text-stone-400'>
                        {client.duration} · {client.goal}
                      </p>
                    </div>
                    <span className='text-xs font-body font-semibold tracking-widest uppercase border border-orange-200 text-orange-600 px-2 py-1'>{client.goal}</span>
                  </div>
                  <div className='flex flex-wrap gap-1.5'>
                    {client.stats.map((s, j) => (
                      <span key={j} className='text-xs font-body text-stone-600 bg-stone-100 px-2 py-1'>
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

      {/* ══════════════════════════════════════
          12 TESTIMONIALS (dark)
      ══════════════════════════════════════ */}
      <section className='py-24 md:py-32 bg-stone-900 text-white border-b border-stone-800'>
        <div className='max-w-7xl mx-auto px-5 md:px-10'>
          <div className='mb-14 gsap-reveal'>
            <p className='text-xs font-body font-semibold tracking-[0.2em] uppercase text-orange-500 mb-4'>{t.testimonials.eyebrow}</p>
            <h2 className=' font-[600] text-4xl lg:text-5xl text-white md: leading-tight'>{t.testimonials.headline}</h2>
          </div>
          <div className='gsap-stagger grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-stone-700'>
            {t.testimonials.items.map((item, i) => (
              <div key={i} className='gsap-stagger-item bg-stone-900 p-8 flex flex-col gap-5'>
                <div className='flex gap-0.5'>
                  {Array(item.stars)
                    .fill(0)
                    .map((_, j) => (
                      <StarIcon key={j} />
                    ))}
                </div>
                <p className='font-body text-sm text-stone-300 md: leading-relaxed flex-1'>"{item.text}"</p>
                <div className='flex items-center gap-3 border-t border-stone-800 pt-5'>
                  <img src={images[`testimonial${i + 1}`]} alt={item.name} className='w-10 h-10 object-cover rounded-full shrink-0 grayscale' />
                  <div>
                    <p className=' text-sm font-[600] text-white'>{item.name}</p>
                    <p className='font-body text-xs text-stone-500'>{item.handle}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          13 COACHING TOOLS (light)
      ══════════════════════════════════════ */}
      <section className='py-24 md:py-32 bg-stone-50 border-b border-stone-200'>
        <div className='max-w-7xl mx-auto px-5 md:px-10'>
          <div className='grid lg:grid-cols-[1fr_2fr] gap-16 items-start'>
            <div className='gsap-reveal'>
              <p className='text-xs font-body font-semibold tracking-[0.2em] uppercase text-orange-600 mb-4'>{t.resources.eyebrow}</p>
              <h2 className=' font-[600] text-4xl lg:text-5xl text-stone-900 md: leading-tight mb-5'>{t.resources.heading}</h2>
              <p className='font-body text-sm text-stone-500 md: leading-relaxed'>{t.resources.sub}</p>
            </div>
            <div className='gsap-stagger grid sm:grid-cols-2 gap-px bg-stone-200'>
              {t.resources.items.map((item, i) => (
                <div key={i} className='gsap-stagger-item bg-stone-50 p-7 hover:bg-white transition-colors duration-200 group'>
                  <div className='w-6 h-px bg-orange-600 mb-5 group-hover:w-10 transition-all duration-300' />
                  <h3 className=' font-[600] text-base text-stone-900 mb-2'>{item.title}</h3>
                  <p className='font-body text-sm text-stone-500 md: leading-relaxed'>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          14 FAQ (dark)
      ══════════════════════════════════════ */}
      <section id='faq' className='py-24 md:py-32 bg-stone-900 text-white border-b border-stone-800'>
        <div className='max-w-4xl mx-auto px-5 md:px-10'>
          <div className='mb-14 gsap-reveal'>
            <p className='text-xs font-body font-semibold tracking-[0.2em] uppercase text-orange-500 mb-4'>{t.faq.eyebrow}</p>
            <h2 className=' font-[600] text-4xl lg:text-5xl text-white md: leading-tight'>{t.faq.headline}</h2>
          </div>
          <div className='gsap-reveal'>
            {t.faq.items.map((item, i) => (
              <div key={i} className='border-b border-stone-700'>
                <button className='w-full flex items-start justify-between gap-6 py-5 text-start' onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i}>
                  <span className='text-xs font-body text-stone-500 font-medium tracking-widest pt-0.5'>{String(i + 1).padStart(2, '0')}</span>
                  <span className='flex-1 text-base  font-semibold text-white md: leading-snug'>{item.q}</span>
                  <span className={`mt-1 flex-shrink-0 w-5 h-5 border border-stone-600 rounded-full flex items-center justify-center transition-transform duration-300 ${openFaq === i ? 'rotate-45 bg-orange-600 border-orange-600' : ''}`}>
                    <svg width='10' height='10' viewBox='0 0 10 10' fill='none'>
                      <line x1='5' y1='0' x2='5' y2='10' stroke={openFaq === i ? 'white' : '#9ca3af'} strokeWidth='1.5' />
                      <line x1='0' y1='5' x2='10' y2='5' stroke={openFaq === i ? 'white' : '#9ca3af'} strokeWidth='1.5' />
                    </svg>
                  </span>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === i ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <p className='pb-5 ps-7 font-body text-stone-400 md: leading-relaxed text-[15px]'>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          15 FINAL CTA (light)
      ══════════════════════════════════════ */}
      <section className='bg-stone-50 py-32 relative overflow-hidden border-b border-stone-200'>
        <span className='absolute -start-16 top-1/2 -translate-y-1/2  text-[18rem] text-stone-100 md: leading-none select-none pointer-events-none'>GO</span>
        <div className='relative max-w-5xl mx-auto px-5 md:px-10 text-center gsap-reveal'>
          <p className='text-xs tracking-[0.3em] uppercase text-orange-600 font-body mb-8'>{t.cta.eyebrow}</p>
          <h2 className=' font-[600] text-6xl md:text-8xl tracking-tighter md: leading-none mb-6 text-stone-900'>
            {t.cta.heading1} <span className='text-orange-600'>{t.cta.headingAccent}</span>
             {t.cta.heading2}
          </h2>
          <p className='font-body text-stone-500 mb-12 text-lg'>{t.cta.sub}</p>
          <a href='#' className='inline-block bg-orange-600 text-white font-body tracking-wide px-12 py-5 text-sm hover:bg-orange-700 transition-colors'>
            {t.cta.btn}
          </a>
          <p className='text-stone-400 text-xs font-body tracking-wide mt-6'>{t.cta.trust}</p>
        </div>
      </section>

      {/* ══════════════════════════════════════
          16 FOOTER
      ══════════════════════════════════════ */}
      <footer className='bg-stone-950 text-white pt-16 pb-8 border-t border-stone-800'>
        <div className='max-w-7xl mx-auto px-5 md:px-10'>
          <div className='grid md:grid-cols-4 gap-10 pb-12 border-b border-stone-800'>
            <div className='md:col-span-1'>
              <div className='flex items-baseline gap-1 mb-3'>
                <span className=' font-[600] text-2xl tracking-tighter md: leading-none text-white'>{t.footer.logo}</span>
                <span className='text-orange-600  text-xs tracking-widest uppercase'>{t.footer.logoSub}</span>
              </div>
              <p className='text-stone-500 text-sm font-body md: leading-relaxed mb-6'>{t.footer.tagline}</p>
              <div className='flex gap-4'>
                {['IG', 'YT', 'TW'].map(s => (
                  <a key={s} href='#' className='text-xs text-stone-600 hover:text-white transition-colors font-body tracking-widest'>
                    {s}
                  </a>
                ))}
              </div>
            </div>
            {t.footer.navGroups.map((group, i) => (
              <div key={i}>
                <p className='text-xs tracking-widest uppercase text-stone-500 font-body mb-4'>{group.heading}</p>
                <ul className='space-y-3'>
                  {group.links.map((l, li) => (
                    <li key={li}>
                      <a href='#' className='text-sm text-stone-400 hover:text-white transition-colors font-body'>
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className='flex flex-col md:flex-row items-center justify-between gap-4 pt-8'>
            <p className='text-xs text-stone-600 font-body'>{t.footer.copyright}</p>
            <a href={`/${isAr ? 'en' : 'ar'}`} className='text-xs text-stone-600 hover:text-white transition-colors font-body tracking-widest uppercase'>
              {t.footer.lang}: {isAr ? 'EN' : 'AR'}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}