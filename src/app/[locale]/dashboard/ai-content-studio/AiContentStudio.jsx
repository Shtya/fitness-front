'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Play, RotateCcw, ExternalLink, Cloud, Settings } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { studioApi } from '@/lib/ai-content-studio/studio-api';
import { createDefaultConfig, getCairoDateKey, getDailyTrendTopic } from '@/lib/ai-content-studio/studio-defaults';
import {
  loadStudioConfig,
  saveStudioConfig,
  exportStudioConfig,
  loadComfyWorkflow,
  saveComfyWorkflow,
} from '@/lib/ai-content-studio/studio-storage';
import { FALLBACK_PROVIDERS, applySavedKeysToConfig, applyChosenProviderToConfig, hasPrettyQualityKeys, shouldAutoOpenKeysGuide, dismissKeysGuide } from '@/lib/ai-content-studio/studio-ui-meta';
import { prettyStudioError } from '@/lib/ai-content-studio/studio-error-map';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import NodeInspector from './components/NodeInspector';
import { RunProgressDock } from './components/RunProgressDock';
import { KeysSetupGuide } from './components/KeysSetupGuide';
import { STUDIO, StudioSparkleLogo } from './components/studio-theme';

function withCustomProvider(config) {
  if (!config) return config;
  const custom = config.customProvider || {};
  const attach = (mod) => {
    if (!mod || mod.provider !== 'custom') return mod;
    return {
      ...mod,
      custom: {
        ...(mod.custom || {}),
        baseUrl: custom.baseUrl,
        method: custom.method,
        bodyTemplate: custom.bodyTemplate,
        responsePath: custom.responsePath,
        headers: (() => {
          try {
            return JSON.parse(custom.headers || '{}');
          } catch {
            return {};
          }
        })(),
      },
    };
  };
  return {
    ...config,
    topic: attach(config.topic),
    content: attach(config.content),
    image: attach(config.image),
  };
}

function HelpModal({ open, onClose, help }) {
  const t = useTranslations('aiContentStudio');
  if (!open || !help) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-3xl border border-[color-mix(in_srgb,var(--color-primary-200)_55%,transparent)] bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{help.name || t('provider')}</h3>
            <p className="text-sm text-slate-500">{help.freeTierNote}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400" aria-label={t('closePanel')}>✕</button>
        </div>
        <ol className="mb-4 list-decimal space-y-2 ps-5 text-sm text-slate-700">
          {(help.helpSteps || []).map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
        {help.getKeyUrl && (
          <a href={help.getKeyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white" style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}>
            {t('openLink')} <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default function AiContentStudio() {
  const t = useTranslations('aiContentStudio');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const [config, setConfig] = useState(null);
  const [providers, setProviders] = useState([]);
  const [secretsMeta, setSecretsMeta] = useState({});
  const [secretDrafts, setSecretDrafts] = useState({});
  const [modelsByProvider, setModelsByProvider] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [tests, setTests] = useState({});
  const [loadingTest, setLoadingTest] = useState({});
  const [running, setRunning] = useState(false);
  const [generatingTopic, setGeneratingTopic] = useState(false);
  const [execution, setExecution] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [help, setHelp] = useState(null);
  const [syncState, setSyncState] = useState('idle');
  const [portalReady, setPortalReady] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [keysGuideOpen, setKeysGuideOpen] = useState(false);
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [keyInspect, setKeyInspect] = useState(null);
  const [keyInspectLoading, setKeyInspectLoading] = useState(false);
  const hydrated = useRef(false);
  const skipServerSave = useRef(true);

  useEffect(() => setPortalReady(true), []);

  const patch = useCallback((updater) => {
    setConfig((prev) => (typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }));
  }, []);

  const patchModule = useCallback((key, partial) => {
    setConfig((prev) => ({ ...prev, [key]: { ...prev[key], ...partial } }));
  }, []);

  const refreshSessions = useCallback(async () => {
    try {
      const { data } = await studioApi.history(50);
      setSessions(Array.isArray(data) ? data : []);
    } catch {
      /* ignore */
    }
  }, []);

  const loadKeyInspect = useCallback(async (force = false) => {
    setKeyInspectLoading(true);
    try {
      const { data } = await studioApi.inspectSecrets(force);
      setKeyInspect(data);
    } catch {
      /* keep last snapshot */
    } finally {
      setKeyInspectLoading(false);
    }
  }, []);

  useEffect(() => {
    const local = loadStudioConfig();
    const workflow = loadComfyWorkflow();
    if (workflow) {
      local.image = {
        ...local.image,
        custom: { ...(local.image.custom || {}), workflowJson: workflow },
      };
    }

    // Rotate daily trending topic into the chat composer (Cairo day)
    if (local.dailyTrendEnabled !== false) {
      const today = getCairoDateKey();
      const nextTrend = getDailyTrendTopic();
      if (local.dailyTrendDate !== today) {
        const wasAuto =
          !String(local.manualTopic || '').trim() ||
          local.manualTopic === local.dailyTrendTopic ||
          local.manualTopic === nextTrend;
        local.dailyTrendDate = today;
        local.dailyTrendTopic = nextTrend;
        if (wasAuto) local.manualTopic = nextTrend;
      } else if (!String(local.manualTopic || '').trim() && local.dailyTrendTopic) {
        local.manualTopic = local.dailyTrendTopic;
      }
    }

    setConfig(local);
    hydrated.current = true;

    (async () => {
      try {
        const [{ data: prov }, { data: sec }] = await Promise.all([
          studioApi.listProviders(),
          studioApi.getSecrets(),
        ]);
        setProviders(prov?.providers || []);
        const secrets = sec?.secrets || {};
        setSecretsMeta(secrets);
        await refreshSessions();
        setConfig((prev) => applySavedKeysToConfig(prev, secrets));
        loadModels('gemini');
        loadKeyInspect(false);
        if (shouldAutoOpenKeysGuide(secrets)) setKeysGuideOpen(true);
      } catch (e) {
        toast.error(e?.response?.data?.message || e.message || 'API error');
        if (shouldAutoOpenKeysGuide({})) setKeysGuideOpen(true);
      }
    })();
  }, [refreshSessions]);

  useEffect(() => {
    if (!hydrated.current || !config) return;
    const tmr = setTimeout(() => {
      saveStudioConfig(config);
      if (config.image?.custom?.workflowJson) saveComfyWorkflow(config.image.custom.workflowJson);
    }, 200);
    return () => clearTimeout(tmr);
  }, [config]);

  useEffect(() => {
    if (!hydrated.current || !config) return;
    if (skipServerSave.current) {
      skipServerSave.current = false;
      return;
    }
    setSyncState('saving');
    const tmr = setTimeout(async () => {
      try {
        await studioApi.saveConfig(exportStudioConfig(withCustomProvider(config)));
        setSyncState('saved');
      } catch {
        setSyncState('error');
      }
    }, 900);
    return () => clearTimeout(tmr);
  }, [config]);

  const providerOptions = useMemo(() => {
    const hidden = new Set(['ai-free', 'llm7-free', 'pollinations-free', 'pollinations-image', 'browser-chatgpt']);
    const fromApi = providers.length
      ? providers
          .filter((p) => !hidden.has(p.id))
          .map((p) => ({
            id: p.id,
            name: p.name,
            costTier: p.costTier,
            capabilities: p.capabilities,
            credentialFields: p.credentialFields,
          }))
      : null;
    return {
      text: fromApi?.filter((p) => p.capabilities?.supportsText) || FALLBACK_PROVIDERS.text,
      image: fromApi?.filter((p) => p.capabilities?.supportsImage) || FALLBACK_PROVIDERS.image,
      all: fromApi || [...FALLBACK_PROVIDERS.text, ...FALLBACK_PROVIDERS.image],
    };
  }, [providers]);

  const loadModels = async (providerId) => {
    if (!providerId || modelsByProvider[providerId]) return;
    try {
      const { data } = await studioApi.providerModels(providerId);
      setModelsByProvider((prev) => ({ ...prev, [providerId]: data.models || [] }));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!config) return;
    ['topic', 'content', 'image'].forEach((m) => {
      const id = config[m]?.provider;
      if (id) loadModels(id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.topic?.provider, config?.content?.provider, config?.image?.provider]);

  const saveSecret = async (provider, fields) => {
    const cleaned = {};
    for (const [k, v] of Object.entries(fields || {})) {
      let s = String(v || '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/^\s*Bearer\s+/i, '')
        .trim();
      const hf = s.match(/hf_[A-Za-z0-9]+/);
      if (hf) s = hf[0];
      if (s) cleaned[k] = s;
    }
    if (!Object.keys(cleaned).length) {
      toast.error(t('secretPlaceholder'));
      return null;
    }
    try {
      const { data } = await studioApi.upsertSecrets({ [provider]: cleaned });
      const nextMeta = data?.secrets || {};
      setSecretsMeta(nextMeta);
      setSecretDrafts((prev) => ({ ...prev, [provider]: {} }));
      try {
        setConfig((prev) => applyChosenProviderToConfig(prev, nextMeta, provider));
      } catch {
        /* key is saved even if provider auto-switch fails */
      }
      if (hasPrettyQualityKeys(nextMeta)) {
        dismissKeysGuide();
      }
      toast.success(t('autoSaved'));
      loadKeyInspect(true);
      return nextMeta;
    } catch (e) {
      const raw = e?.response?.data?.message;
      const msg = Array.isArray(raw) ? raw.filter(Boolean).join(', ') : raw;
      toast.error(String(msg || e?.message || t('autoSaveError')));
      return null;
    }
  };

  const continueWithSavedKeys = (providerId) => {
    dismissKeysGuide();
    const chosen = providerId || 'gemini';
    setConfig((prev) => applyChosenProviderToConfig(prev, secretsMeta, chosen));
    loadModels(chosen);
    setKeysGuideOpen(false);
  };

  const skipKeyGuide = () => {
    dismissKeysGuide();
    setKeysGuideOpen(false);
  };

  const closeKeysGuide = () => {
    dismissKeysGuide();
    setKeysGuideOpen(false);
  };

  const openHelp = async (providerId, fallback) => {
    try {
      const { data } = await studioApi.providerHelp(providerId);
      setHelp({ ...(fallback || {}), ...(data || {}), name: data?.name || fallback?.name || providerId });
    } catch {
      setHelp(fallback || { name: providerId, helpSteps: [], freeTierNote: '' });
    }
  };

  const runTest = async (module, body = {}) => {
    setLoadingTest((p) => ({ ...p, [module]: true }));
    setTests((p) => ({ ...p, [module]: null }));
    try {
      const { data } = await studioApi.testModule(module, body);
      setTests((p) => ({ ...p, [module]: data }));
      if (data?.ok === false) toast.error(prettyStudioError(data, t).title);
      else if (data?.message && (module === 'facebook' || module === 'instagram')) {
        if (data.loggedIn === false || data.posted === false) toast(data.message, { icon: 'ℹ️' });
        else toast.success(data.message);
      } else toast.success(`${module} ✓`);
    } catch (e) {
      const err = {
        ok: false,
        module,
        status: e?.response?.status,
        message: e?.response?.data?.message || e.message,
        code: e?.response?.data?.code,
      };
      setTests((p) => ({ ...p, [module]: err }));
      toast.error(prettyStudioError(err, t).title);
    } finally {
      setLoadingTest((p) => ({ ...p, [module]: false }));
    }
  };

  const mapExecution = (data) => ({
    executionId: data.executionId || data.id,
    status: data.status,
    topic: data.topic,
    content: data.content,
    headline: data.headline,
    imageUrl: data.imageUrl,
    finalImageUrl: data.finalImageUrl,
    publicImageUrl: data.publicImageUrl,
    providers: data.providers || data.providersJson,
    models: data.models || data.modelsJson,
    research: data.research || data.researchJson,
    progress: data.progress || data.progressJson,
    facebookStatus: data.facebookStatus,
    instagramStatus: data.instagramStatus,
    facebookPostId: data.facebookPostId,
    instagramMediaId: data.instagramMediaId,
    errors: data.errors || data.errorsJson,
    logs: data.logs || data.logsJson,
    durationMs: data.durationMs,
    trigger: data.trigger,
    createdAt: data.createdAt,
  });

  const pollExecution = async (executionId) => {
    const started = Date.now();
    const maxMs = 8 * 60 * 1000;
    while (Date.now() - started < maxMs) {
      await new Promise((r) => setTimeout(r, 550));
      try {
        const { data } = await studioApi.historyOne(executionId);
        const mapped = mapExecution(data);
        setExecution(mapped);
        if (mapped.status === 'COMPLETED' || mapped.status === 'FAILED') return mapped;
      } catch {
        /* keep polling */
      }
    }
    return null;
  };

  const generateTopic = async () => {
    setGeneratingTopic(true);
    try {
      const { data } = await studioApi.trending();
      const topics = Array.isArray(data?.topics) ? data.topics : [];
      setTrendingTopics(topics);
      const title = String(topics[0]?.title || '').trim();
      if (!title) {
        toast.error(t('generateTopicError'));
        return;
      }
      patch({ manualTopic: title, topicSource: 'manual' });
      toast.success(t('generateTopicOk'));
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || t('generateTopicError'));
    } finally {
      setGeneratingTopic(false);
    }
  };

  const loadTrending = async () => {
    if (trendingTopics.length || trendingLoading) return;
    setTrendingLoading(true);
    try {
      const { data } = await studioApi.trending();
      setTrendingTopics(Array.isArray(data?.topics) ? data.topics : []);
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || t('generateTopicError'));
    } finally {
      setTrendingLoading(false);
    }
  };

  const runNow = async () => {
    setRunning(true);
    setProgressOpen(true);
    setSelectedId(null);
    setExecution({
      status: 'RUNNING',
      logs: [],
      errors: [],
      progress: {
        phase: 'starting',
        percent: 2,
        message: 'Starting…',
        messageAr: 'بيبدأ…',
        steps: [
          { id: 'start', status: 'active', label: 'Start', labelAr: 'البداية' },
          { id: 'topic', status: 'pending', label: 'Topic', labelAr: 'الموضوع' },
          { id: 'research', status: 'pending', label: 'Research', labelAr: 'البحث' },
          { id: 'content', status: 'pending', label: 'Content', labelAr: 'المحتوى' },
          { id: 'image', status: 'pending', label: 'Image', labelAr: 'الصورة' },
          { id: 'validate', status: 'pending', label: 'Quality', labelAr: 'المراجعة' },
        ],
      },
    });
    try {
      await studioApi.saveConfig(exportStudioConfig(withCustomProvider(config)));
      const { data } = await studioApi.run({
        publish: false,
        async: true,
        configOverride: exportStudioConfig(withCustomProvider(config)),
      });
      const started = mapExecution(data);
      setExecution(started);
      const final =
        started.status === 'COMPLETED' || started.status === 'FAILED'
          ? started
          : await pollExecution(started.executionId);
      if (final) {
        setExecution(final);
        await refreshSessions();
        setSelectedId('preview');
        if (final.status === 'FAILED') {
          const first = Array.isArray(final.errors) ? final.errors[0] : null;
          toast.error(first ? prettyStudioError(first, t).title : t('pipelineStopped'));
        }
        else toast.success(t('pipelineReady'));
      } else {
        toast.error(t('pipelineStopped'));
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
      setExecution((prev) => (prev?.status === 'RUNNING' ? { ...prev, status: 'FAILED' } : prev));
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    if (!progressOpen || running || execution?.status === 'RUNNING') return undefined;
    if (execution?.status === 'COMPLETED' || execution?.status === 'FAILED') {
      const id = setTimeout(() => setProgressOpen(false), 1600);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [progressOpen, running, execution?.status]);

  const publish = async (targets) => {
    if (!execution?.executionId) {
      toast.error(t('publishNeedRun'));
      return;
    }
    setRunning(true);
    try {
      const { data } = await studioApi.publish({
        executionId: execution.executionId,
        ...targets,
      });
      setExecution(data);
      await refreshSessions();
      const errors = data.errors || data.errorsJson || [];
      const fbWanted = Boolean(targets.facebook);
      const igWanted = Boolean(targets.instagram);
      const fbErr = errors.find((e) => e?.module === 'facebook');
      const igErr = errors.find((e) => e?.module === 'instagram');
      const fbOk = data.facebookStatus === 'published';
      const igOk = data.instagramStatus === 'published';
      if (fbWanted && !fbOk) {
        toast.error(prettyStudioError(fbErr || { module: 'facebook', message: t('publishNotPosted') }, t).title);
      } else if (igWanted && !igOk) {
        toast.error(prettyStudioError(igErr || { module: 'instagram', message: t('publishNotPosted') }, t).title);
      } else {
        toast.success(t('published'));
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    } finally {
      setRunning(false);
    }
  };

  const retryModule = async (module) => {
    if (!execution?.executionId) return;
    setRunning(true);
    try {
      const { data } = await studioApi.retry(execution.executionId, module);
      setExecution(data);
      await refreshSessions();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    } finally {
      setRunning(false);
    }
  };

  const openSession = async (id) => {
    try {
      const { data } = await studioApi.historyOne(id);
      setExecution(mapExecution(data));
      setSelectedId('preview');
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    }
  };

  const resetConfig = () => {
    if (!confirm(t('resetConfirm'))) return;
    const next = createDefaultConfig();
    setConfig(next);
    saveStudioConfig(next);
    toast(t('resetDone'));
  };

  if (!config) {
    return (
      <div className="flex h-[70vh] items-center justify-center text-slate-500">{t('sessionsLoading')}</div>
    );
  }

  const syncLabel =
    syncState === 'saving' ? t('autoSaving') : syncState === 'saved' ? t('autoSaved') : syncState === 'error' ? t('autoSaveError') : t('autoSaveIdle');

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="relative flex h-full min-h-0 flex-col overflow-hidden"
       
    >
      <div
        className="pointer-events-none absolute left-[8%] top-[-80px] h-[380px] w-[520px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.16) 0%, rgba(59,130,246,0.08) 45%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute right-[6%] top-[18%] h-[320px] w-[420px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute left-0 top-8 h-80 w-72 opacity-[0.32]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.7) 1px, transparent 0)',
          backgroundSize: '18px 18px',
          maskImage: 'linear-gradient(135deg, black 0%, transparent 75%)',
          WebkitMaskImage: 'linear-gradient(135deg, black 0%, transparent 75%)',
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 opacity-[0.28]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.65) 1px, transparent 0)',
          backgroundSize: '18px 18px',
          maskImage: 'linear-gradient(315deg, black 0%, transparent 72%)',
          WebkitMaskImage: 'linear-gradient(315deg, black 0%, transparent 72%)',
        }}
      />
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.2]" aria-hidden>
        <path d="M-80 70 C 160 -10, 280 190, 560 70 S 980 -40, 1400 90" fill="none" stroke="#C4B5FD" strokeWidth="1.5" />
        <path d="M-40 200 C 220 120, 400 300, 720 160 S 1140 80, 1500 210" fill="none" stroke="#93C5FD" strokeWidth="1.3" />
      </svg>

      <header
        className="relative z-20 mx-5 mt-5 flex min-h-[72px] shrink-0 flex-wrap items-center gap-2 rounded-[20px] bg-white px-5 py-2.5 sm:mx-7 sm:px-6"
        style={{ boxShadow: STUDIO.shadow }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <StudioSparkleLogo size={40} />
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-bold leading-tight tracking-tight text-[#111827]">{t('title')}</h1>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] leading-none text-[#6B7280]">
              <Cloud
                size={11}
                className={
                  syncState === 'saving'
                    ? 'animate-pulse text-[#6366F1]'
                    : syncState === 'saved'
                      ? 'text-[#10B981]'
                      : syncState === 'error'
                        ? 'text-rose-500'
                        : 'text-[#9CA3AF]'
                }
              />
              <span>{syncLabel}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 px-1 text-[12px]">
            <span className="text-[#6B7280]">{t('automation')}</span>
            <button
              type="button"
              onClick={() => patch({ automationEnabled: !config.automationEnabled })}
              className={`relative h-5 w-9 rounded-full transition ${config.automationEnabled ? 'bg-[#6366F1]' : 'bg-slate-300'}`}
              aria-pressed={config.automationEnabled}
              aria-label={t('automation')}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${config.automationEnabled ? 'start-4' : 'start-0.5'}`} />
            </button>
            <strong className="text-[11px] font-bold tracking-wide text-[#111827]">{config.automationEnabled ? t('on') : t('off')}</strong>
          </div>

          <button
            type="button"
            onClick={() => setSelectedId((cur) => (cur === 'settings' ? null : 'settings'))}
            className={`inline-flex h-9 items-center gap-1.5 border px-3.5 text-[12px] font-semibold ${
              selectedId === 'settings' ? 'border-transparent text-white' : 'bg-white text-[#111827] hover:bg-slate-50'
            }`}
            style={
              selectedId === 'settings'
                ? { background: STUDIO.gradient, borderRadius: STUDIO.btnRadius, boxShadow: STUDIO.shadow3dPrimary }
                : { borderColor: STUDIO.border, borderRadius: STUDIO.btnRadius, boxShadow: STUDIO.shadow3d }
            }
          >
            <Settings size={13} /> {t('settings')}
          </button>

          <button
            type="button"
            onClick={runNow}
            disabled={running || generatingTopic}
            className="inline-flex h-9 items-center gap-1.5 border border-transparent px-4 text-[12px] font-bold text-white disabled:opacity-60"
            style={{ background: STUDIO.gradient, borderRadius: STUDIO.btnRadius, boxShadow: STUDIO.shadow3dPrimary }}
          >
            <Play size={11} fill="currentColor" /> {running ? t('running') : t('runNow')}
          </button>

          <button
            type="button"
            onClick={resetConfig}
            className="inline-flex h-9 items-center gap-1.5 border bg-white px-3.5 text-[12px] font-semibold text-[#111827] hover:bg-slate-50"
            style={{ borderColor: STUDIO.border, borderRadius: STUDIO.btnRadius, boxShadow: STUDIO.shadow3d }}
          >
            <RotateCcw size={13} /> {t('reset')}
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <WorkflowCanvas
          config={config}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId((cur) => (cur === id ? null : id))}
          execution={execution}
          tests={tests}
          running={running}
          onSelectPreview={() => setSelectedId('preview')}
          onSelectSessions={() => setSelectedId('sessions')}
          previewOpen={selectedId === 'preview'}
          sessionsOpen={selectedId === 'sessions'}
          onManualTopicChange={(manualTopic) => patch({ manualTopic })}
          onTopicSourceChange={(topicSource) => patch({ topicSource })}
          onSubmitTopic={runNow}
          onGenerateTopic={generateTopic}
          generatingTopic={generatingTopic}
          onToggleEnabled={(key, enabled) => patchModule(key, { enabled })}
          trendingTopics={trendingTopics}
          trendingLoading={trendingLoading}
          onOpenTrending={loadTrending}
          onSelectTrendingTopic={(title) => patch({ manualTopic: title, topicSource: 'manual' })}
          onPublish={publish}
          onPreview={() => setSelectedId('preview')}
          facebookConnected={config.facebook?.publishMode !== 'api' || Boolean(secretsMeta?.facebook)}
          instagramConnected={config.instagram?.publishMode !== 'api' || Boolean(secretsMeta?.instagram)}
        />

        {portalReady && selectedId &&
          createPortal(
            <>
              <button
                type="button"
                aria-label={t('closePanel')}
                className="fixed inset-0 z-[55] bg-slate-950/25 backdrop-blur-[1px]"
                onClick={() => setSelectedId(null)}
              />
              <aside
                dir={isRtl ? 'rtl' : 'ltr'}
                className="fixed inset-y-3 z-[56] w-[min(430px,calc(100vw-1.25rem))] overflow-hidden rounded-[24px] border border-[#e4e4e7] bg-white/95 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] backdrop-blur-xl end-3"
              >
                <NodeInspector
                  selectedId={selectedId}
                  onClose={() => setSelectedId(null)}
                  config={config}
                  patch={patch}
                  patchModule={patchModule}
                  providerOptions={providerOptions}
                  modelsByProvider={modelsByProvider}
                  loadModels={loadModels}
                  secretsMeta={secretsMeta}
                  secretDrafts={secretDrafts}
                  setSecretDrafts={setSecretDrafts}
                  saveSecret={saveSecret}
                  openHelp={openHelp}
                  runTest={runTest}
                  tests={tests}
                  loadingTest={loadingTest}
                  execution={execution}
                  publish={publish}
                  retryModule={retryModule}
                  running={running}
                  sessions={sessions}
                  onOpenSession={openSession}
                  onRefreshSessions={refreshSessions}
                  onOpenKeysGuide={() => setKeysGuideOpen(true)}
                  keyInspect={keyInspect}
                  keyInspectLoading={keyInspectLoading}
                  onRefreshKeyInspect={() => loadKeyInspect(true)}
                />
              </aside>
            </>,
            document.body,
          )}
      </div>

      {portalReady &&
        createPortal(
          <RunProgressDock
            open={progressOpen}
            execution={execution}
            running={running}
            onClose={() => setProgressOpen(false)}
          />,
          document.body,
        )}

      <HelpModal open={Boolean(help)} onClose={() => setHelp(null)} help={help} />
      <KeysSetupGuide
        open={keysGuideOpen}
        onClose={closeKeysGuide}
        secretsMeta={secretsMeta}
        saveSecret={saveSecret}
        onContinueWithKeys={continueWithSavedKeys}
        onSkipDefaults={skipKeyGuide}
      />
    </div>
  );
}
