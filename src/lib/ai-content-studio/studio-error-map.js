const NODE_KEYS = new Set([
  'topic',
  'research',
  'content',
  'image',
  'design',
  'facebook',
  'instagram',
  'pipeline',
  'validate',
]);

const KINDS = new Set([
  'IMAGE_QUOTA_WAIT',
  'IMAGE_QUOTA_UNAVAILABLE',
  'TEXT_QUOTA',
  'NOT_CONFIGURED',
  'PUBLIC_URL_REQUIRED',
  'FB_LOGIN_REQUIRED',
  'IG_LOGIN_REQUIRED',
  'FB_POST_FAILED',
  'GENERIC',
]);

function friendlyGeminiName(id) {
  const raw = String(id || '')
    .replace(/^models\//, '')
    .trim();
  if (!raw) return 'Gemini';
  return raw
    .replace(/^gemini-?/i, 'Gemini ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseQuotaFromError(error) {
  const msg = String(error?.message || error?.suggestedAction || '');
  const modelId = String(error?.quotaModel || msg.match(/model:\s*([a-z0-9._-]+)/i)?.[1] || '').replace(
    /^models\//,
    '',
  );
  const limit = Number(error?.quotaLimit || msg.match(/limit:\s*(\d+)/i)?.[1] || 0);
  return {
    model: friendlyGeminiName(modelId),
    limit: Number.isFinite(limit) && limit > 0 ? String(limit) : '',
  };
}

function parseRetrySeconds(error) {
  const explicit = Number(error?.retryAfterSeconds);
  if (Number.isFinite(explicit) && explicit > 0) return Math.min(120, Math.ceil(explicit));
  const msg = String(error?.message || error?.suggestedAction || '');
  const named = msg.match(/retry in\s+~?([\d.]+)\s*s/i) || msg.match(/wait\s+~?([\d.]+)\s*s/i);
  if (named) return Math.min(120, Math.ceil(Number(named[1])));
  return 0;
}

function isQuotaLike(error, msg) {
  const code = String(error?.code || '').toUpperCase();
  const status = Number(error?.status || 0);
  return (
    status === 429 ||
    code === 'RESOURCE_EXHAUSTED' ||
    /quota|rate limit|resource_exhausted|exhausted your current quota|free-tier may be 0|image quota/i.test(msg)
  );
}

export function resolveStudioErrorKind(error = {}) {
  const known = String(error?.kind || '');
  if (KINDS.has(known) && known !== 'GENERIC') return known;

  const code = String(error?.code || '');
  const msg = String(error?.message || error?.suggestedAction || '');
  const moduleId = String(error?.module || '');
  if (code === 'NOT_CONFIGURED') return 'NOT_CONFIGURED';
  if (code === 'PUBLIC_URL_REQUIRED') return 'PUBLIC_URL_REQUIRED';
  if (code === 'FB_LOGIN_REQUIRED') return 'FB_LOGIN_REQUIRED';
  if (code === 'IG_LOGIN_REQUIRED') return 'IG_LOGIN_REQUIRED';
  if (code === 'FB_POST_CLICK_FAILED' || code === 'FB_NOT_POSTED') return 'FB_POST_FAILED';

  if (isQuotaLike(error, msg)) {
    const imageish = moduleId === 'image' || /image|nano banana|gemini-.*-image/i.test(msg);
    const seconds = parseRetrySeconds(error);
    const hardZero = /limit:\s*0|free-tier may be 0|isn.?t available on the free plan/i.test(msg);
    if (imageish && seconds > 0) return 'IMAGE_QUOTA_WAIT';
    if (imageish && hardZero) return 'IMAGE_QUOTA_UNAVAILABLE';
    if (imageish) return 'IMAGE_QUOTA_UNAVAILABLE';
    return 'TEXT_QUOTA';
  }
  return 'GENERIC';
}

export function prettyStudioError(error, t) {
  const kind = resolveStudioErrorKind(error);
  const seconds = parseRetrySeconds(error);
  const moduleId = String(error?.module || '');
  let node = moduleId;
  try {
    if (NODE_KEYS.has(moduleId)) node = t(`nodes.${moduleId}.label`);
  } catch {
    node = moduleId || t('failed');
  }
  const quota = parseQuotaFromError(error);
  const vars = {
    seconds: Math.max(seconds, 1),
    node,
    model: quota.model,
    limit: quota.limit || '—',
  };
  const fallbackBody = String(error?.title || error?.message || t('lastRunFailed'));
  const read = (key, fallback) => {
    try {
      const value = t(key, vars);
      if (!value || value === key) return fallback;
      return value;
    } catch {
      return fallback;
    }
  };
  return {
    kind,
    seconds,
    node,
    title: read(`clientErrors.${kind}.title`, error?.title || `${node} — ${t('failed')}`),
    body: read(`clientErrors.${kind}.body`, error?.message || fallbackBody),
    action: read(`clientErrors.${kind}.action`, error?.suggestedAction || ''),
  };
}

export function remainingRetrySeconds(error, now = Date.now()) {
  const total = parseRetrySeconds(error);
  if (total <= 0) return 0;
  const started = Date.parse(error?.at || '');
  if (!Number.isFinite(started)) return 0;
  return Math.max(0, total - Math.floor((now - started) / 1000));
}
