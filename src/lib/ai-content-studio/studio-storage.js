import { STORAGE_KEY, createDefaultConfig, migrateConfig } from './studio-defaults';

const SECRET_KEY_RE = /apiKey|token|secret|password|accessToken|apiToken/i;

function scrub(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(scrub);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SECRET_KEY_RE.test(k)) continue;
    out[k] = typeof v === 'object' ? scrub(v) : v;
  }
  return out;
}

export function loadStudioConfig() {
  if (typeof window === 'undefined') return createDefaultConfig();
  try {
    // Prefer v3; fall back to older keys once and migrate
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem('automationStudio:v4') ||
      localStorage.getItem('automationStudio:v3') ||
      localStorage.getItem('automationStudio:v2') ||
      localStorage.getItem('automationStudio:v1');
    if (!raw) return createDefaultConfig();
    const migrated = migrateConfig(JSON.parse(raw));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    } catch {
      /* ignore */
    }
    return migrated;
  } catch {
    return createDefaultConfig();
  }
}

export function saveStudioConfig(config) {
  if (typeof window === 'undefined') return;
  const safe = scrub({ ...config, version: config?.version || 10 });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
}

export function exportStudioConfig(config) {
  return scrub({ ...config, version: config?.version || 10, exportedAt: new Date().toISOString() });
}

export function importStudioConfig(json) {
  const parsed = typeof json === 'string' ? JSON.parse(json) : json;
  return migrateConfig(scrub(parsed));
}

export function loadComfyWorkflow() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('automationStudio:comfyWorkflow') || '';
}

export function saveComfyWorkflow(json) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('automationStudio:comfyWorkflow', json || '');
}
