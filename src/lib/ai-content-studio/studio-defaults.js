import { GEMINI_CONTENT_MODEL, GEMINI_IMAGE_MODEL, GEMINI_TOPIC_MODEL, GROQ_TEXT_MODEL } from './studio-ui-meta';

export const STORAGE_KEY = 'automationStudio:v5';

const DEPRECATED_GEMINI_IMAGE_MODELS = new Set([
  'gemini-2.0-flash-preview-image-generation',
  'gemini-2.0-flash-exp-image-generation',
  'gemini-2.5-flash-image-preview',
  'gemini-2.0-flash-exp',
  'gemini-3.1-flash-lite-image',
]);

const WEAK_GROQ_TEXT_MODELS = new Set([
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'qwen/qwen3-32b',
  'openai/gpt-oss-20b',
  '',
]);

/** Curated daily trend bank for So7baFit parenting audience (rotated by Cairo date) */
export const DAILY_TREND_TOPICS = [
  'لما الطفل يطلب الشاشة أول ما يفوق من النوم — إزاي نحط حد بلُطف في بيت المغتربين؟',
  'المدرسة في الخليج بتطلب والبيت لسه على إيقاع مصر — إزاي نوسّط بدون صراع؟',
  'لما تتعب وتقول «خلاص هسكت»… وطفلك بيفهم إن الحد اتكسر',
  'المقارنة على الواتساب مع الأهل في مصر: هدية ولا ضغط خفي؟',
  'طفل بيتكلم بلهجتين في البيت والمدرسة — خوف على الهوية ولا فرصة؟',
  'وقت الشاشات في الإجازة الطويلة: قاعدة واحدة تنقذ الأسبوع كله',
  'لما الأب شغال ليل ونهار والأم لوحدها في التربية — مين «يريح» مين؟',
  'درجات المدرسة وقلق المغترب: إمتى التشجيع يبقى ضغط؟',
  'غياب العيلة الكبيرة: إزاي نبني «سند» بديل من غير ما نستنزف نفسنا؟',
  'الطفل بيرفض الأكل «البيت» بعد ما داق مطاعم الخليج — معركة ولا حوار؟',
  'صلاة وتربية في إيقاع سريع: عادة صغيرة تمسك اليوم',
  'لما الطفل يقول «أصحابي عندهم» — التعامل مع المظاهر بدون إذلال أو تدليل',
  'النوم المتأخر بسبب الزيارات والشغل — روتين لطيف يرجع البيت لهدوئه',
  'العقاب بالصوت العالي وأنت متعب: ليه بيحصل وإيه البديل العملي؟',
];

/** Shown in the chat composer by default / daily rotation */
export const DEFAULT_SAMPLE_TOPIC = DAILY_TREND_TOPICS[0];

export function getCairoDateKey(date = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/** Deterministic daily trending topic for the chat box */
export function getDailyTrendTopic(date = new Date()) {
  const key = getCairoDateKey(date);
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return DAILY_TREND_TOPICS[hash % DAILY_TREND_TOPICS.length];
}

export const DEFAULT_PERSONA = {
  name: 'Maged Said',
  role: 'خبير تربوي واستشاري أسري',
    instructions: `أكتب بأسلوب «الكوتشيانو»: مزيج من التحليل النفسي العميق، والتأصيل الإيماني المريح للقلب، وحس الفكاهة المصري الأصيل.

أخاطب أولياء الأمور المصريين المغتربين في الخليج. ألمس الوجع من غير إذلال، وأسمّي المشاعر بأسمائها، وأفهم الاحتراق النفسي من غير أحكام.

هيكل كل منشور حصريًا:
1) س: سؤال خطاف بلسان حال الأب أو الأم.
2) ج: فقرات قصيرة فيها (واقع كوميدي يومي + عمق نفسي مطمئن + لمسة إيمانية).
3) سؤال تفاعل مفتوح يختم بـ 👇💬

أهتم بالهوية، اللهجات، غياب تيتا وجدو، الأب اللي بقى ATM، فقاعة الكمباوند، شبح النزول النهائي، والشاشات.
أتجنب السياسة والطائفية والوعظ الثقيل والإحصاءات المختلقة.`,
};

export const DEFAULT_TOPIC_PROMPT = `أنت كوتش تربوي يخاطب أولياء أمور مصريين مغتربين في الخليج (جمهور So7baFit / أسلوب الكوتشيانو).

المطلوب: موضوع واحد فقط لمنشور اليوم — حاد، ملحّ، ومشبع بالموقف اليومي (مش فكرة عامة).

اختر زاوية من واقع المغتربين مثل:
- الشاشات والحدود داخل البيت
- الهوية بين البيت والمدرسة
- غياب العيلة الكبيرة والضغط لوحدك
- المقارنة الاجتماعية والمظاهر
- ضغط الدراسة والدرجات
- التربية وأنت متعب/بعيد عن الأهل
- الثبات الإيماني وسط الإيقاع السريع

اكتب الموضوع في جملة واحدة قوية وواضحة (14–24 كلمة) فيها موقف ملموس + إحساس/صراع.
مثال للروح (لا تنسخه): لما الطفل يطلب الشاشة أول ما يفوق… وإحنا بنكسّر الحد عشان نكمّل يومنا.

ممنوع: مقدمة، تعداد، شرح، علامات اقتباس، جمل وعظية فضفاضة، أو أكثر من سطر واحد.
أعد الجملة فقط.`;

export const DEFAULT_CONTENT_PROMPT = `الموضوع:
{{topic}}

اكتب منشور فيسبوك/إنستجرام بأسلوب الكوتشيانو لجمهور: {{audience}}.

اللغة: عربية مصرية فصحى ميسّرة طبيعية (زي كلام راجل واعي بيتكلم مع أهله) — مش فصحى ثقيلة، ومش عامية مكسّرة، ومش ترجمة من الإنجليزي.

اجعل المنشور قويًا ومعبّرًا وعميقًا (مش نصيحة سطحية ولا كلام رقيق بلا عصب). لازم يظهر بوضوح:
1) مشهد يومي واقعي لأسرة مصرية مغتربة (تفاصيل ملموسة: وقت، مكان، جملة قالها الطفل/الأب/الأم)
2) قراءة نفسية صادقة: ليه بنعمل كده؟ إيه الخوف أو الإرهاق اللي وراه؟
3) تأصيل إيماني مختصر وصادق (سطر أو سطرين كحد أقصى — بدون خطابة)
4) جملة ذهبية واحدة قوية تُحفظ
5) خطوة عملية واحدة واضحة يمكن تنفيذها الليلة
6) سؤال ختامي مباشر يشجّع التعليق

هيكل مطلوب:
- افتتاحية تمسّ العصب من أول سطرين (موقف أو جملة تُوقف السكرول)
- 4–7 فقرات قصيرة قوية (سطرين إلى ثلاثة لكل فقرة)
- الجملة الذهبية في سطر لوحدها
- خاتمة عملية + سؤال تفاعلي

استخدم إيموجي بحساب (2–5 كحد أقصى).
الطول: حوالي 220–380 كلمة (منشور غني، مش فقرة ضعيفة).

ممنوع تمامًا:
- العبارات العامة الميتة مثل: «من المهم أن…»، «يجب علينا…»، «في عالمنا اليوم…»، «التربية فن…»
- النص المترجم أو المولَّد الضعيف أو النبرة الواعظة الثقيلة
- عناوين داخلية مثل «مقدمة» أو «الخاتمة»
- تكرار نفس الفكرة بثلاث صياغات

أعد نص المنشور فقط.`;

/** Base image look is built server-side from content+topic. This field is optional extras only. */
export const DEFAULT_IMAGE_EXTRA_PROMPT = '';

/** @deprecated kept for migration detection only */
export const DEFAULT_IMAGE_PROMPT = `Create a premium photorealistic Instagram/Facebook square poster for an Arabic Egyptian parenting brand (So7baFit).

Post topic:
{{topic}}

Photography requirements:
- Photorealistic DSLR look, 85mm portrait lens, soft natural window light
- Real human faces with correct anatomy: clear eyes, natural skin, accurate hands
- Modest contemporary Gulf/Egyptian family clothing; warm lived-in home interior
- One strong focal subject; clean empty space in the lower third for headline overlay

Hard avoid: cartoons, illustration, melted/blurred faces, glowing white eyes, deformed hands, text, logos, watermarks, low-resolution AI artifacts.

Style: photorealistic editorial social poster, magazine quality.`;

export const PROMPT_VARIABLES = [
  'topic',
  'content',
  'headline',
  'date',
  'day',
  'brand_name',
  'audience',
  'language',
];

export const RESEARCH_SOURCES = [
  { id: 'google', labelKey: 'researchSources.google' },
  { id: 'facebook', labelKey: 'researchSources.facebook' },
  { id: 'instagram', labelKey: 'researchSources.instagram' },
  { id: 'news', labelKey: 'researchSources.news' },
];

export const DAYS = [
  { id: 'sat', label: 'Sat' },
  { id: 'sun', label: 'Sun' },
  { id: 'mon', label: 'Mon' },
  { id: 'tue', label: 'Tue' },
  { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' },
  { id: 'fri', label: 'Fri' },
];

export function createDefaultConfig() {
  return {
    version: 10,
    automationEnabled: true,
    freeMode: false,
    language: 'ar',
    audience: 'Egyptian Parents',
    brandName: 'So7baFit',
    manualTopic: getDailyTrendTopic(),
    dailyTrendEnabled: true,
    dailyTrendDate: getCairoDateKey(),
    dailyTrendTopic: getDailyTrendTopic(),
    autoPublish: false,
    topicSource: 'ai',
    persona: { ...DEFAULT_PERSONA },
    research: {
      enabled: true,
      sources: ['google', 'facebook', 'instagram'],
      brief:
        'دور على فيسبوك وإنستجرام ترندات تربية الأسر المصرية المغتربة في الخليج: الهوية، اللهجات، غياب الأجداد، الأب ATM، النزول النهائي، الشاشات.',
      maxResults: 10,
    },
    schedule: {
      enabled: true,
      time: '21:00',
      days: DAYS.map((d) => d.id),
      timezone: 'Africa/Cairo',
    },
    topic: {
      enabled: true,
      provider: 'gemini',
      model: GEMINI_TOPIC_MODEL,
      prompt: '', // extra instructions only; final prompt is built server-side
    },
    content: {
      enabled: true,
      provider: 'gemini',
      model: GEMINI_CONTENT_MODEL,
      prompt: '', // extra instructions only; final prompt is built server-side
    },
    image: {
      enabled: true,
      provider: 'gemini',
      model: GEMINI_IMAGE_MODEL,
      prompt: DEFAULT_IMAGE_EXTRA_PROMPT,
      aspectRatio: '1:1',
      resolution: '1024x1024',
      negativePrompt: 'text, watermark, logo, cartoon, deformed hands, extra fingers, blurry, low quality',
      custom: { workflowJson: '' },
    },
    design: {
      enabled: false,
      mode: 'off',
      template: 'arabic-social-1',
      headline: '',
      font: 'Tahoma',
      fontSize: 48,
      fontWeight: 700,
      position: 'bottom',
      alignment: 'right',
      backgroundOverlay: 0.4,
      brandColor: '#6366f1',
      textColor: '#ffffff',
      logoUrl: '',
    },
    facebook: { enabled: false, pageId: '', publishMode: 'browser' },
    instagram: { enabled: false, igUserId: '', publishMode: 'browser' },
    customProvider: {
      name: '',
      baseUrl: '',
      method: 'POST',
      headers: '{}',
      bodyTemplate: '{"model":"{{model}}","messages":[{"role":"user","content":"{{prompt}}"}]}',
      responsePath: 'choices[0].message.content',
    },
    ui: { openSections: ['schedule', 'topic', 'content', 'image'] },
  };
}

export function applyFreeMode(config) {
  return {
    ...config,
    freeMode: false,
    topic: {
      ...config.topic,
      provider: 'gemini',
      model: GEMINI_TOPIC_MODEL,
    },
    content: {
      ...config.content,
      provider: 'gemini',
      model: GEMINI_CONTENT_MODEL,
    },
    image: {
      ...config.image,
      provider: 'gemini',
      model: GEMINI_IMAGE_MODEL,
    },
  };
}

/** Schema migrations for automationStudio */
export function migrateConfig(raw) {
  if (!raw || typeof raw !== 'object') return createDefaultConfig();
  const version = Number(raw.version) || 1;
  let cfg = { ...createDefaultConfig(), ...raw };

  if (version < 2) {
    cfg.freeMode = false;
  }

  if (version < 10) {
    cfg.freeMode = false;
    cfg.research = {
      ...(cfg.research || {}),
      enabled: true,
      sources: cfg.research?.sources?.length ? cfg.research.sources : ['google', 'facebook', 'instagram'],
      maxResults: cfg.research?.maxResults || 10,
      brief:
        cfg.research?.brief ||
        'دور على فيسبوك وإنستجرام ترندات تربية الأسر المصرية المغتربة في الخليج: الهوية، اللهجات، غياب الأجداد، الأب ATM، النزول النهائي، الشاشات.',
    };
  }

  cfg.version = 10;

  const FREE_TEXT = new Set(['ai-free', 'llm7-free', 'pollinations-free', 'browser-chatgpt']);
  const FREE_IMAGE = new Set(['pollinations-image']);
  if (!cfg.topic?.provider || FREE_TEXT.has(cfg.topic.provider) || cfg.topic.model === 'auto') {
    cfg.topic = { ...cfg.topic, provider: 'gemini', model: GEMINI_TOPIC_MODEL };
  }
  if (!cfg.content?.provider || FREE_TEXT.has(cfg.content.provider) || cfg.content.model === 'auto') {
    cfg.content = { ...cfg.content, provider: 'gemini', model: GEMINI_CONTENT_MODEL };
  }
  if (!cfg.image?.provider || FREE_IMAGE.has(cfg.image.provider) || cfg.image.provider === 'huggingface') {
    cfg.image = { ...cfg.image, provider: 'gemini', model: GEMINI_IMAGE_MODEL };
  }

  // v3 used to copy the full system prompt into the node field — that field is extras only now
  if (version < 3 && cfg.manualTopic == null) cfg.manualTopic = '';

  // v6: node.prompt is optional extra instructions; the real prompt lives on the server
  if (looksLikeLegacyFullTextPrompt(cfg.topic?.prompt)) {
    cfg.topic = { ...cfg.topic, prompt: '' };
  }
  if (looksLikeLegacyFullTextPrompt(cfg.content?.prompt)) {
    cfg.content = { ...cfg.content, prompt: '' };
  }

  // v4: image.prompt is optional extras only; visual is built from content+topic on the server
  if (version < 4 || looksLikeLegacyFullImagePrompt(cfg.image?.prompt)) {
    cfg.image = {
      ...cfg.image,
      prompt: '',
      negativePrompt:
        cfg.image?.negativePrompt ||
        'text, watermark, logo, cartoon, deformed hands, extra fingers, blurry, low quality',
    };
  }

  // v5: seed sticky-note sample topic so the page opens ready to Run / test the flow
  if (version < 5 && !String(cfg.manualTopic || '').trim()) {
    cfg.manualTopic = DEFAULT_SAMPLE_TOPIC;
  }

  // v7: retired Gemini image model IDs (preview-image-generation is gone from v1beta)
  if (cfg.image?.provider === 'gemini' && DEPRECATED_GEMINI_IMAGE_MODELS.has(String(cfg.image?.model || ''))) {
    cfg.image = { ...cfg.image, model: GEMINI_IMAGE_MODEL };
  }

  // v8: upgrade weak Groq text models used for Arabic parenting posts
  if (cfg.topic?.provider === 'groq' && WEAK_GROQ_TEXT_MODELS.has(String(cfg.topic?.model || ''))) {
    cfg.topic = { ...cfg.topic, model: GROQ_TEXT_MODEL };
  }
  if (cfg.content?.provider === 'groq' && WEAK_GROQ_TEXT_MODELS.has(String(cfg.content?.model || ''))) {
    cfg.content = { ...cfg.content, model: GROQ_TEXT_MODEL };
  }

  if (cfg.manualTopic == null) cfg.manualTopic = getDailyTrendTopic();
  if (cfg.dailyTrendEnabled == null) cfg.dailyTrendEnabled = true;
  if (!cfg.dailyTrendTopic) cfg.dailyTrendTopic = getDailyTrendTopic();
  if (!cfg.dailyTrendDate) cfg.dailyTrendDate = getCairoDateKey();
  if (!cfg.research) {
    cfg.research = {
      enabled: true,
      sources: ['google', 'facebook', 'instagram'],
      brief:
        'دور على فيسبوك وإنستجرام ترندات تربية الأسر المصرية المغتربة في الخليج: الهوية، اللهجات، غياب الأجداد، الأب ATM، النزول النهائي، الشاشات.',
      maxResults: 10,
    };
  }
  if (!cfg.persona || (!cfg.persona.name && !cfg.persona.role && !cfg.persona.instructions)) {
    cfg.persona = { ...DEFAULT_PERSONA };
  }
  if (!cfg.topicSource) cfg.topicSource = 'ai';
  if (!cfg.facebook) cfg.facebook = { enabled: false, pageId: '', publishMode: 'browser' };
  if (!cfg.facebook.publishMode) cfg.facebook = { ...cfg.facebook, publishMode: 'browser' };
  if (!cfg.instagram) cfg.instagram = { enabled: false, igUserId: '', publishMode: 'browser' };
  if (!cfg.instagram.publishMode) cfg.instagram = { ...cfg.instagram, publishMode: 'browser' };

  return cfg;
}

function looksLikeLegacyFullTextPrompt(prompt) {
  const p = String(prompt || '').trim();
  if (!p) return false;
  return (
    p === DEFAULT_TOPIC_PROMPT.trim() ||
    p === DEFAULT_CONTENT_PROMPT.trim() ||
    p.includes('أنت كوتش تربوي يخاطب أولياء أمور') ||
    p.includes('اكتب منشور فيسبوك/إنستجرام بأسلوب الكوتشيانو') ||
    p.includes('سؤال الخطاف') ||
    p.includes('أسلوب «الكوتشيانو»') ||
    p.includes('أعطني موضوعاً تربوياً واحداً') ||
    p.includes('اكتب منشوراً تفاعلياً مناسباً لفيسبوك') ||
    (p.length > 350 && p.includes('هيكل مطلوب'))
  );
}

function looksLikeLegacyFullImagePrompt(prompt) {
  const p = String(prompt || '').trim();
  if (!p) return false;
  return (
    p.includes('Create a premium Instagram/Facebook square poster') ||
    p.includes('Create a warm modern Arabic Egyptian Islamic social media visual') ||
    (p.includes('{{topic}}') && p.length > 400)
  );
}
