export const COST_BADGE = {
  FREE: { label: 'FREE', tone: 'green' },
  FREE_TIER: { label: 'Free Tier', tone: 'green' },
  LIMITED_FREE: { label: 'Limited Free Credits', tone: 'amber' },
  PAID: { label: 'PAID', tone: 'rose' },
  SELF_HOSTED: { label: 'Self-hosted', tone: 'green' },
  UNKNOWN: { label: 'UNKNOWN', tone: 'slate' },
};

export const FALLBACK_PROVIDERS = {
  text: [
    { id: 'gemini', name: 'Google Gemini', costTier: 'FREE_TIER' },
    { id: 'groq', name: 'Groq', costTier: 'FREE_TIER' },
    { id: 'cloudflare', name: 'Cloudflare Workers AI', costTier: 'FREE_TIER' },
    { id: 'huggingface', name: 'Hugging Face', costTier: 'LIMITED_FREE' },
    { id: 'openai_compatible', name: 'OpenAI-compatible', costTier: 'UNKNOWN' },
    { id: 'custom', name: 'Custom Provider', costTier: 'UNKNOWN' },
  ],
  image: [
    { id: 'gemini', name: 'Google Gemini / Nano Banana Pro', costTier: 'FREE_TIER' },
    { id: 'huggingface', name: 'Hugging Face', costTier: 'LIMITED_FREE' },
    { id: 'cloudflare', name: 'Cloudflare Workers AI', costTier: 'FREE_TIER' },
    { id: 'comfyui', name: 'Local ComfyUI', costTier: 'SELF_HOSTED' },
    { id: 'openai_compatible', name: 'OpenAI-compatible Image API', costTier: 'UNKNOWN' },
    { id: 'custom', name: 'Custom HTTP API', costTier: 'UNKNOWN' },
  ],
};

const NO_KEY_PROVIDER_IDS = new Set([
  'ai-free',
  'llm7-free',
  'pollinations-free',
  'pollinations-image',
  'browser-chatgpt',
  'comfyui',
]);

/** True when this provider needs an API key (show key icon / secret field). */
export function providerNeedsApiKey(provider) {
  if (!provider) return true;
  const id = typeof provider === 'string' ? provider : provider.id;
  if (NO_KEY_PROVIDER_IDS.has(id)) return false;
  const tier = typeof provider === 'object' ? provider.costTier : undefined;
  if (tier === 'FREE' || tier === 'SELF_HOSTED') return false;
  if (typeof provider === 'object' && Array.isArray(provider.credentialFields) && provider.credentialFields.length === 0) {
    return false;
  }
  return true;
}

const FREE_TEXT_PROVIDERS = new Set(['ai-free', 'llm7-free', 'pollinations-free', 'browser-chatgpt']);
const FREE_IMAGE_PROVIDERS = new Set(['pollinations-image']);

export const KEYS_GUIDE_DISMISSED_KEY = 'aiContentStudio:keysGuideDismissed:v2';

export function isKeysGuideDismissed() {
  try {
    return localStorage.getItem(KEYS_GUIDE_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

/** Persist that the first-run keys overlay should never auto-open again. */
export function dismissKeysGuide() {
  try {
    localStorage.setItem(KEYS_GUIDE_DISMISSED_KEY, '1');
  } catch {
    /* ignore quota / private mode */
  }
}

/** Auto-open once on first visit so the user can pick an AI and paste/edit the key. */
export function shouldAutoOpenKeysGuide(_secretsMeta) {
  return !isKeysGuideDismissed();
}

/** Recommended keys shown first on the setup guide (pretty quality). */
export const SETUP_KEY_GUIDES = [
  {
    id: 'gemini',
    recommended: true,
    uses: ['topic', 'content', 'image'],
    fields: [{ key: 'apiKey', secret: true, labelKey: 'apiKeyField', label: 'API Key' }],
  },
  {
    id: 'groq',
    recommended: false,
    uses: ['topic', 'content'],
    fields: [{ key: 'apiKey', secret: true, labelKey: 'apiKeyField', label: 'API Key' }],
  },
  {
    id: 'huggingface',
    recommended: false,
    uses: ['image'],
    fields: [{ key: 'apiKey', secret: true, labelKey: 'apiKeyField', label: 'HF Token' }],
  },
  {
    id: 'openai_compatible',
    recommended: false,
    uses: ['topic', 'content', 'image'],
    fields: [
      { key: 'apiKey', secret: true, labelKey: 'apiKeyField', label: 'API Key' },
      { key: 'baseUrl', secret: false, labelKey: 'baseUrlField', label: 'Base URL' },
    ],
  },
  {
    id: 'cloudflare',
    recommended: false,
    uses: ['image', 'content'],
    fields: [
      { key: 'accountId', secret: false, labelKey: 'accountId' },
      { key: 'apiToken', secret: true, labelKey: 'apiTokenField' },
    ],
  },
];

export function isProviderSecretConfigured(secretsMeta, providerId, field) {
  const block = secretsMeta?.[providerId];
  if (!block) return false;
  if (field) return Boolean(block.fields?.[field]?.configured);
  return Boolean(block.configured);
}

/** Fields to collect when a keyed provider has no saved secret. */
export function keyFieldsForProvider(providerId, option) {
  const guide = SETUP_KEY_GUIDES.find((g) => g.id === providerId);
  if (guide) return guide.fields;
  const creds = option?.credentialFields;
  if (Array.isArray(creds) && creds.length) {
    return creds
      .filter((f) => f.secret !== false || f.key === 'accountId' || f.key === 'baseUrl')
      .map((f) => ({
        key: f.key,
        secret: f.secret !== false && /key|token|secret/i.test(f.key),
        label: f.label,
        labelKey:
          f.key === 'apiKey'
            ? 'apiKeyField'
            : f.key === 'apiToken'
              ? 'apiTokenField'
              : f.key === 'accountId'
                ? 'accountId'
                : f.key === 'baseUrl'
                  ? 'baseUrlField'
                  : null,
        placeholder: f.placeholder,
      }));
  }
  return [{ key: 'apiKey', secret: true, labelKey: 'apiKeyField' }];
}

export function hasPrettyQualityKeys(secretsMeta) {
  return SETUP_KEY_GUIDES.some((g) => isProviderSecretConfigured(secretsMeta, g.id));
}

const DEPRECATED_GEMINI_IMAGE_MODELS = new Set([
  'gemini-2.0-flash-preview-image-generation',
  'gemini-2.0-flash-exp-image-generation',
  'gemini-2.5-flash-image-preview',
  'gemini-2.0-flash-exp',
  'gemini-3.1-flash-lite-image',
]);

export const GEMINI_TOPIC_MODEL = 'gemini-2.5-flash';
export const GEMINI_CONTENT_MODEL = 'gemini-2.5-pro';
export const GEMINI_TEXT_MODEL = GEMINI_TOPIC_MODEL;
export const GEMINI_IMAGE_MODEL = 'gemini-3-pro-image';
/** Strongest Groq writing model currently available for long Arabic posts. */
export const GROQ_TEXT_MODEL = 'openai/gpt-oss-120b';

export function recommendedGeminiModel(moduleKey) {
  if (moduleKey === 'content') return GEMINI_CONTENT_MODEL;
  if (moduleKey === 'image') return GEMINI_IMAGE_MODEL;
  if (moduleKey === 'validation' || moduleKey === 'trending' || moduleKey === 'research') return GEMINI_TOPIC_MODEL;
  return GEMINI_TOPIC_MODEL;
}

function pickTextProvider(_secretsMeta, moduleKey = 'topic') {
  return { provider: 'gemini', model: recommendedGeminiModel(moduleKey) };
}

function pickImageProvider(_secretsMeta) {
  return { provider: 'gemini', model: GEMINI_IMAGE_MODEL };
}

/**
 * If saved keys exist, point topic/content/image at those providers.
 * Without keys, keep (or restore) the free defaults.
 * force=true replaces the current pick; otherwise only upgrades free defaults / missing keys.
 */
export function applySavedKeysToConfig(config, secretsMeta, { force = false } = {}) {
  if (!config) return config;
  const topicPick = pickTextProvider(secretsMeta, 'topic');
  const contentPick = pickTextProvider(secretsMeta, 'content');
  const image = pickImageProvider(secretsMeta);

  const nextTopic = { ...(config.topic || {}) };
  const nextContent = { ...(config.content || {}) };
  const nextImage = { ...(config.image || {}) };
  let changed = false;

  const replaceText = (mod, pick) => {
    const weakText =
      !mod.provider ||
      FREE_TEXT_PROVIDERS.has(mod.provider) ||
      mod.provider !== 'gemini' ||
      !mod.model ||
      mod.model === 'auto' ||
      /gemini-2\.0-flash$|gemini-1\.5/i.test(String(mod.model || ''));
    if (force || weakText) {
      if (mod.provider !== pick.provider || mod.model !== pick.model) {
        mod.provider = pick.provider;
        mod.model = pick.model;
        return true;
      }
    }
    return false;
  };

  if (replaceText(nextTopic, topicPick)) changed = true;
  if (replaceText(nextContent, contentPick)) changed = true;

  const staleGeminiImage =
    nextImage.provider === 'gemini' && DEPRECATED_GEMINI_IMAGE_MODELS.has(String(nextImage.model || ''));
  const weakImage =
    !nextImage.provider ||
    FREE_IMAGE_PROVIDERS.has(nextImage.provider) ||
    nextImage.provider !== 'gemini' ||
    !nextImage.model;
  if (force || staleGeminiImage || weakImage) {
    if (nextImage.provider !== image.provider || nextImage.model !== image.model) {
      nextImage.provider = image.provider;
      nextImage.model = image.model;
      changed = true;
    }
  }

  if (!changed) return config;
  return { ...config, freeMode: false, topic: nextTopic, content: nextContent, image: nextImage };
}

/** Apply the AI the user picked in the first-run keys popup. */
export function applyChosenProviderToConfig(config, secretsMeta, providerId) {
  if (!config) return config;
  const id = String(providerId || 'gemini').trim() || 'gemini';
  if (id === 'gemini' || !id) {
    return applySavedKeysToConfig({ ...config, freeMode: false }, secretsMeta, { force: true });
  }
  const next = { ...config, freeMode: false };
  const geminiImage = isProviderSecretConfigured(secretsMeta, 'gemini');
  if (id === 'groq') {
    return {
      ...next,
      topic: { ...next.topic, provider: 'groq', model: GROQ_TEXT_MODEL },
      content: { ...next.content, provider: 'groq', model: GROQ_TEXT_MODEL },
      image: geminiImage
        ? { ...next.image, provider: 'gemini', model: GEMINI_IMAGE_MODEL }
        : { ...next.image },
    };
  }
  if (id === 'openai_compatible') {
    return {
      ...next,
      topic: { ...next.topic, provider: 'openai_compatible', model: next.topic?.model || 'gpt-4o-mini' },
      content: { ...next.content, provider: 'openai_compatible', model: next.content?.model || 'gpt-4o-mini' },
    };
  }
  if (id === 'huggingface') {
    return {
      ...next,
      image: { ...next.image, provider: 'huggingface', model: 'black-forest-labs/FLUX.1-schnell' },
    };
  }
  if (id === 'cloudflare') {
    return {
      ...next,
      image: { ...next.image, provider: 'cloudflare', model: '@cf/black-forest-labs/flux-1-schnell' },
    };
  }
  return next;
}

/** Fit scores (0–100) for this pipeline: Arabic parenting posts + social visuals. */
export const PROVIDER_FIT = {
  topic: {
    'ai-free': { score: 70, reason: 'No-key fallback — weaker Arabic voice' },
    groq: { score: 88, reason: 'Fast; use GPT-OSS 120B if no Gemini' },
    gemini: { score: 96, reason: 'Best Arabic nuance for topic angles' },
    'llm7-free': { score: 62, reason: 'Free, but shorter/weaker ideas' },
    'pollinations-free': { score: 55, reason: 'Backup only' },
    'browser-chatgpt': { score: 68, reason: 'Slow last-resort' },
    cloudflare: { score: 64, reason: 'OK if you already have a token' },
    huggingface: { score: 60, reason: 'Queue/limits on free tier' },
    openai_compatible: { score: 88, reason: 'Great if you plug a strong model' },
    custom: { score: 50, reason: 'Depends entirely on your API' },
  },
  content: {
    gemini: { score: 97, reason: 'Strongest Arabic coaching tone for this brand' },
    groq: { score: 89, reason: 'GPT-OSS 120B — strong backup when Gemini unavailable' },
    openai_compatible: { score: 90, reason: 'Use if you have GPT-class access' },
    'ai-free': { score: 64, reason: 'Works without a key — quality often thin' },
    'llm7-free': { score: 58, reason: 'Fine for drafts, weaker voice' },
    cloudflare: { score: 66, reason: 'Short posts OK, long Arabic weaker' },
    huggingface: { score: 60, reason: 'Rate limits; mixed Arabic' },
    'pollinations-free': { score: 50, reason: 'Too short for a full post' },
    'browser-chatgpt': { score: 70, reason: 'Quality OK, very slow' },
    custom: { score: 50, reason: 'Depends entirely on your API' },
  },
  image: {
    gemini: { score: 92, reason: 'Best family/scene fidelity for this brand' },
    comfyui: { score: 90, reason: 'Highest control if you have a local GPU' },
    huggingface: { score: 82, reason: 'FLUX.1 — strong, limited free credits' },
    cloudflare: { score: 80, reason: 'FLUX Schnell — good social stills' },
    'pollinations-image': { score: 45, reason: 'Free fallback only — faces/hands often broken' },
    openai_compatible: { score: 88, reason: 'Use if you have an image API' },
    custom: { score: 50, reason: 'Depends entirely on your API' },
  },
};

export const PROVIDER_HELP = {
  gemini: {
    name: 'Google Gemini',
    getKeyUrl: 'https://aistudio.google.com/apikey',
    freeTierNote: 'Create an API key in Google AI Studio. Some Gemini models have a free tier with limits.',
    helpSteps: [
      'Open Google AI Studio.',
      'Sign in with Google.',
      'Create an API Key.',
      'Save it in Server-side secrets on this page (Replace).',
    ],
  },
  groq: {
    name: 'Groq',
    getKeyUrl: 'https://console.groq.com/keys',
    freeTierNote: 'Create an API key in Groq Console. Free plan has rate limits.',
    helpSteps: [
      'Create a Groq Console account.',
      'Open API Keys.',
      'Create a new key.',
      'Save it in Server-side secrets only.',
    ],
  },
  cloudflare: {
    name: 'Cloudflare Workers AI',
    getKeyUrl: 'https://dash.cloudflare.com/?to=/:account/workers/ai',
    freeTierNote: 'Workers AI has a free allocation. Limits can change.',
    helpSteps: [
      'Open Cloudflare Dashboard.',
      'Copy your Account ID.',
      'Create an API Token with Workers AI permission.',
      'Save Account ID + Token in Server-side secrets.',
    ],
  },
  huggingface: {
    name: 'Hugging Face',
    getKeyUrl: 'https://huggingface.co/settings/tokens',
    freeTierNote:
      'Limited free credits. FLUX uses fal-ai (not deprecated hf-inference). Save the token in Studio API keys per user — not in .env.',
    helpSteps: [
      'Open Hugging Face Settings → Access Tokens.',
      'Create a token with Inference Providers permission.',
      'Paste it in Studio → API keys → Hugging Face (Replace).',
      'Prefer Google Gemini for images when you have a Gemini key.',
    ],
  },
  openai_compatible: {
    name: 'OpenAI-compatible',
    getKeyUrl: 'https://platform.openai.com/api-keys',
    freeTierNote: 'Depends on the provider you point to.',
    helpSteps: [
      'Provide a Base URL compatible with OpenAI (/v1).',
      'Add an API key if required.',
      'Set the model name.',
    ],
  },
  comfyui: {
    name: 'Local ComfyUI',
    getKeyUrl: 'https://github.com/comfyanonymous/ComfyUI',
    freeTierNote: 'Self-hosted — no per-image API fee if you run your own GPU.',
    helpSteps: [
      'Run ComfyUI locally or on a GPU box.',
      'Open the UI (default http://127.0.0.1:8188).',
      'Export workflow JSON into the field.',
      'Test connection, then generate.',
    ],
  },
  custom: {
    name: 'Custom Provider',
    getKeyUrl: '',
    freeTierNote: 'Entirely depends on the API you configure.',
    helpSteps: [
      'Set Name and Base URL.',
      'Add Headers and a Body Template with {{prompt}} and {{model}}.',
      'Set Response JSON Path, e.g. choices[0].message.content.',
    ],
  },
  'ai-free': {
    name: 'AI Free Auto (no key)',
    getKeyUrl: '',
    freeTierNote: 'Fully free — no API key.',
    helpSteps: [
      'No API key needed.',
      'Auto chain: LLM7 → Pollinations → Browser ChatGPT.',
      'Retries automatically if a provider fails.',
    ],
  },
  'llm7-free': {
    name: 'LLM7 Free (no key)',
    getKeyUrl: 'https://api.llm7.io',
    freeTierNote: 'Free, no key — same stack as AI Free.',
    helpSteps: [
      'No API key needed.',
      'Uses open models such as gpt-oss:20b.',
      'If it fails, switch fallback to Pollinations Free.',
    ],
  },
  'pollinations-free': {
    name: 'Pollinations Free Text',
    getKeyUrl: 'https://pollinations.ai',
    freeTierNote: 'Free, no key — short text backup.',
    helpSteps: ['No API key needed.', 'Best as a short-text fallback.'],
  },
  'pollinations-image': {
    name: 'Pollinations Free Image',
    getKeyUrl: 'https://pollinations.ai',
    freeTierNote: 'Free, no key — first-run images.',
    helpSteps: [
      'No API key needed.',
      'Images come from image.pollinations.ai.',
      'Retries with turbo if flux fails.',
    ],
  },
  'browser-chatgpt': {
    name: 'Browser ChatGPT (Free)',
    getKeyUrl: '',
    freeTierNote: 'Free, no key — last-resort via headless browser.',
    helpSteps: [
      'No API key needed.',
      'Opens ChatGPT in a headless browser — slower.',
      'Server may need Chrome installed.',
    ],
  },
};

export const META_SETUP_STEPS = {
  facebook: [
    'أنشئ تطبيقًا في Meta for Developers.',
    'أضف منتج Facebook Login / Pages API.',
    'احصل على Page Access Token بصلاحيات pages_manage_posts و pages_read_engagement.',
    'انسخ Page ID و Access Token إلى Server-side secrets (ليس localStorage).',
  ],
  instagram: [
    'اربط Instagram Professional Account بصفحة فيسبوك.',
    'احصل على Instagram Business Account ID.',
    'استخدم Access Token بصلاحيات instagram_basic و instagram_content_publish.',
    'تأكد أن الصورة متاحة عبر HTTPS عام قبل النشر.',
  ],
};
