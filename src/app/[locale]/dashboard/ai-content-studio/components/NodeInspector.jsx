'use client';

import { useEffect, useRef, useState } from 'react';
import {
  X,
  ExternalLink,
  HelpCircle,
  Eye,
  EyeOff,
  Play,
  RefreshCw,
  Download,
  Settings,
  Check,
  ChevronDown,
  MonitorPlay,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  FieldLabel,
  TextInput,
  TextArea,
  SelectBox,
  TestResultPanel,
  InfoTip,
} from './studio-ui';
import { DesignControls, DesignPreview } from './design-preview';
import { DAYS, RESEARCH_SOURCES } from '@/lib/ai-content-studio/studio-defaults';
import { META_SETUP_STEPS, isProviderSecretConfigured, providerNeedsApiKey, hasPrettyQualityKeys } from '@/lib/ai-content-studio/studio-ui-meta';
import { ProviderSelect } from './ProviderSelect';
import { AddProviderKeyModal } from './AddProviderKeyModal';
import { WORKFLOW_NODES } from './WorkflowCanvas';
import { studioApi } from '@/lib/ai-content-studio/studio-api';
import { getNodeOutput } from './NodeResult';
import { ScrapedPostsGallery } from './ScrapedPostsGallery';
import { StudioErrorCard } from './StudioErrorCard';
import { KeyInspectCard } from './KeyInspectCard';
import toast from 'react-hot-toast';

function uniqueModelOptions(list = []) {
  const seenId = new Set();
  const seenLabel = new Set();
  const out = [];
  for (const item of list) {
    const id = String(item?.id || '').trim();
    const label = String(item?.label || id).trim();
    const labelKey = label.toLowerCase().replace(/\s+/g, ' ');
    if (!id || seenId.has(id) || seenLabel.has(labelKey)) continue;
    seenId.add(id);
    seenLabel.add(labelKey);
    out.push({ ...item, id, label });
  }
  return out;
}

function listedModelValue(current, models = []) {
  const id = String(current || '');
  if (!id) return '';
  if (models.some((m) => m.id === id)) return id;
  const stable = id.replace(/-preview(-\d{2}-\d{2})?$/i, '').replace(/-(exp|latest)$/i, '');
  return models.find((m) => m.id === stable)?.id || id;
}

function SecretRow({ label, configured, hint, value, onChange, onSave, helpSlot }) {
  const t = useTranslations('aiContentStudio');
  const [show, setShow] = useState(false);
  const [replacing, setReplacing] = useState(!configured);
  return (
    <div className="space-y-1.5">
      <FieldLabel hint={helpSlot}>{label}</FieldLabel>
      {configured && !replacing ? (
        <div className="flex gap-2">
          <div className="flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 font-mono text-xs text-slate-600">
            {hint || t('secretMasked')}
          </div>
          <button type="button" onClick={() => setReplacing(true)} className="rounded-lg border border-slate-200 px-2.5 text-xs font-medium">
            {t('replace')}
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <TextInput
              className="!rounded-lg !py-2 pe-9 text-xs"
              type={show ? 'text' : 'password'}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={t('secretPlaceholder')}
              autoComplete="off"
            />
            <button type="button" className="absolute end-2 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setShow((s) => !s)}>
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button
            type="button"
            onClick={async () => {
              await onSave();
              setReplacing(false);
            }}
            className="rounded-lg px-2.5 text-xs font-medium text-white"
            style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
          >
            {t('saveSecret')}
          </button>
        </div>
      )}
    </div>
  );
}

function NodeLiveOutput({ nodeId, execution, tests }) {
  const t = useTranslations('aiContentStudio');
  const output = getNodeOutput(nodeId, execution, tests);
  if (!output) return null;

  if (output.type === 'error') {
    return <StudioErrorCard error={{ module: nodeId, ...output.error }} compact />;
  }

  if (output.type === 'text') {
    return (
      <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-3">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
          <span>{t('lastResult')}</span>
          {output.provider && (
            <span className="normal-case tracking-normal text-emerald-800/80">
              {output.provider}
              {output.model ? ` · ${output.model}` : ''}
            </span>
          )}
        </div>
        <p className="line-clamp-4 text-[13px] leading-relaxed text-slate-800" dir="auto">{output.text}</p>
      </div>
    );
  }

  if (output.type === 'image') {
    return (
      <div className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-primary-200)_50%,transparent)] bg-slate-950">
        <div className="flex items-center justify-between gap-2 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">
          <span className="min-w-0 truncate">
            {t('lastImage')}
            {output.provider ? (
              <span className="ml-2 normal-case tracking-normal text-white/90">
                {output.provider}
                {output.model ? ` · ${output.model}` : ''}
              </span>
            ) : null}
          </span>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-800"
            onClick={() => {
              const a = document.createElement('a');
              a.href = output.url;
              a.download = `so7ba-${nodeId}-${Date.now()}.png`;
              a.click();
            }}
          >
            <Download size={10} /> {t('download')}
          </button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={output.url} alt="" className="max-h-44 w-full object-cover" />
      </div>
    );
  }

  if (output.type === 'publish') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
        {t('publishedOk')}
        {output.id ? ` · ${output.id}` : ''}
      </div>
    );
  }

  return null;
}

function EnableRow({ enabled, onChange, label = 'Enabled' }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[color-mix(in_srgb,var(--color-primary-200)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-primary-50)_70%,white)] px-3 py-2.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative h-6 w-11 rounded-full transition ${enabled ? 'bg-[var(--color-primary-500)]' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${enabled ? 'start-5' : 'start-0.5'}`} />
      </button>
    </div>
  );
}

export default function NodeInspector({
  selectedId,
  onClose,
  config,
  patch,
  patchModule,
  providerOptions,
  modelsByProvider,
  loadModels,
  secretsMeta,
  secretDrafts,
  setSecretDrafts,
  saveSecret,
  openHelp,
  runTest,
  tests,
  loadingTest,
  execution,
  publish,
  retryModule,
  running,
  sessions,
  onOpenSession,
  onRefreshSessions,
  onOpenKeysGuide,
  keyInspect,
  keyInspectLoading,
  onRefreshKeyInspect,
}) {
  const t = useTranslations('aiContentStudio');
  const locale = useLocale();

  if (!selectedId) return null;

  if (selectedId === 'preview') {
    return (
      <InspectorShell title={t('nodes.preview.label')} subtitle={t('nodes.preview.subtitle')} onClose={onClose}>
        <PreviewPanel execution={execution} publish={publish} retryModule={retryModule} running={running} />
      </InspectorShell>
    );
  }

  if (selectedId === 'sessions' || selectedId === 'history') {
    return (
      <InspectorShell title={t('nodes.sessions.label')} subtitle={t('nodes.sessions.subtitle')} onClose={onClose}>
        <SessionsPanel
          sessions={sessions}
          onOpenSession={onOpenSession}
          onRefresh={onRefreshSessions}
          locale={locale}
        />
      </InspectorShell>
    );
  }

  if (selectedId === 'settings') {
    return (
      <InspectorShell title={t('settingsTitle')} subtitle={t('settingsSubtitle')} icon={Settings} info={t('settingsHint')} onClose={onClose}>
        <SettingsForm
          config={config}
          patch={patch}
          patchModule={patchModule}
          secretsMeta={secretsMeta}
          onOpenKeysGuide={onOpenKeysGuide}
          keyInspect={keyInspect}
          keyInspectLoading={keyInspectLoading}
          onRefreshKeyInspect={onRefreshKeyInspect}
        />
      </InspectorShell>
    );
  }

  const node = WORKFLOW_NODES.find((n) => n.id === selectedId);
  if (!node) return null;
  const Icon = node.icon;
  const mod = config[node.configKey] || {};

  return (
    <InspectorShell
      title={t(`nodes.${node.id}.label`)}
      subtitle={t(`nodes.${node.id}.subtitle`)}
      icon={Icon}
      info={t(`nodes.${node.id}.info`)}
      onClose={onClose}
    >
      {selectedId === 'schedule' && (
        <ScheduleForm mod={mod} patchModule={patchModule} config={config} patch={patch} />
      )}
      {selectedId === 'topic' && (
        <TopicNodeForm
          mod={mod}
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
        />
      )}
      {(selectedId === 'content' || selectedId === 'image') && (
        <AiModuleForm
          moduleKey={selectedId}
          kind={node.kind}
          mod={mod}
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
        />
      )}
      {selectedId === 'design' && (
        <div className="space-y-3">
          <EnableRow
            label={t('enabled')}
            enabled={Boolean(mod.enabled)}
            onChange={(enabled) => patchModule('design', { enabled, mode: enabled ? mod.mode || 'canvas' : 'off' })}
          />
          <DesignControls design={mod} onChange={(design) => patch({ design })} />
          <DesignPreview
            imageUrl={execution?.finalImageUrl || execution?.imageUrl || tests.image?.result || tests.comfyui?.result}
            design={mod}
            headline={mod.headline}
            topic={execution?.topic}
          />
        </div>
      )}
      {selectedId === 'facebook' && (
        <>
          <NodeLiveOutput nodeId="facebook" execution={execution} tests={tests} />
          <MetaForm
            platform="facebook"
            mod={mod}
            patchModule={patchModule}
            secretsMeta={secretsMeta}
            secretDrafts={secretDrafts}
            setSecretDrafts={setSecretDrafts}
            saveSecret={saveSecret}
            runTest={runTest}
            tests={tests}
            loadingTest={loadingTest}
            execution={execution}
            publish={publish}
            running={running}
          />
        </>
      )}
      {selectedId === 'instagram' && (
        <>
          <NodeLiveOutput nodeId="instagram" execution={execution} tests={tests} />
          <MetaForm
            platform="instagram"
            mod={mod}
            patchModule={patchModule}
            secretsMeta={secretsMeta}
            secretDrafts={secretDrafts}
            setSecretDrafts={setSecretDrafts}
            saveSecret={saveSecret}
            runTest={runTest}
            tests={tests}
            loadingTest={loadingTest}
            execution={execution}
            publish={publish}
            running={running}
          />
        </>
      )}
    </InspectorShell>
  );
}

function InspectorShell({ title, subtitle, icon: Icon, onClose, children, info }) {
  const t = useTranslations('aiContentStudio');
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-3 border-b border-[#e4e4e7] px-4 py-4">
        {Icon && (
          <span
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-md"
            style={{ background: 'linear-gradient(90deg, #6366F1, #3B82F6)' }}
          >
            <Icon size={18} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="inline-flex items-center gap-1.5 text-sm font-bold tracking-tight text-slate-900">
            {title}
            {info ? <InfoTip text={info} /> : null}
          </h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          <p className="mt-1 text-[11px] text-slate-400">{t('configureStep')}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <X size={16} />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">{children}</div>
    </div>
  );
}

function SettingsForm({ config, patch, patchModule, secretsMeta, onOpenKeysGuide, keyInspect, keyInspectLoading, onRefreshKeyInspect }) {
  const t = useTranslations('aiContentStudio');
  const persona = config.persona || {};
  const geminiReady = hasPrettyQualityKeys(secretsMeta);
  const [tab, setTab] = useState('voice');
  const tabs = [
    { id: 'voice', label: t('settingsVoice') },
    { id: 'keys', label: t('settingsKeys') },
    { id: 'schedule', label: t('settingsSchedule') },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`min-w-0 flex-1 rounded-lg px-2 py-1.5 text-[11px] font-bold leading-tight ${
              tab === item.id ? 'bg-white text-[#4338CA] shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'voice' && (
        <div className="space-y-3">
          <div>
            <FieldLabel info={t('settingsHint')}>{t('personaName')}</FieldLabel>
            <TextInput
              className="!rounded-lg !py-2"
              value={persona.name || ''}
              onChange={(e) => patch({ persona: { ...persona, name: e.target.value } })}
              placeholder={t('personaNamePlaceholder')}
            />
          </div>
          <div>
            <FieldLabel info={t('settingsHint')}>{t('personaRole')}</FieldLabel>
            <TextInput
              className="!rounded-lg !py-2"
              value={persona.role || ''}
              onChange={(e) => patch({ persona: { ...persona, role: e.target.value } })}
              placeholder={t('personaRolePlaceholder')}
            />
          </div>
          <div>
            <FieldLabel info={t('settingsHint')}>{t('personaInstructions')}</FieldLabel>
            <TextArea
              className="!min-h-[160px] !rounded-lg text-[13px] leading-relaxed"
              dir="auto"
              value={persona.instructions || ''}
              onChange={(e) => patch({ persona: { ...persona, instructions: e.target.value } })}
              placeholder={t('personaInstructionsPlaceholder')}
            />
          </div>
        </div>
      )}

      {tab === 'keys' && (
        <div className="space-y-3">
          <p className="flex items-start gap-1.5 text-[12px] leading-relaxed text-slate-500">
            <InfoTip text={t('settingsKeysHint')} className="mt-0.5 shrink-0" />
            <span>{t('settingsKeysHint')}</span>
          </p>
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${
              geminiReady
                ? 'border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]'
                : 'border-[#E5E7EB] bg-white text-slate-600'
            }`}
          >
            {geminiReady ? <Sparkles size={11} className="text-[#10B981]" /> : null}
            {geminiReady ? t('prettyModeOn') : t('prettyModeOff')}
          </span>
          <button
            type="button"
            onClick={() => onOpenKeysGuide?.()}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[10px] border border-[#C7D2FE] bg-white px-3.5 text-[12px] font-semibold text-[#4338CA] hover:bg-[#EEF2FF]"
          >
            <KeyRound size={13} /> {t('keysGuideButton')}
          </button>
          <div className="space-y-3">
            {keyInspectLoading && !keyInspect ? (
              <KeyInspectCard report={null} loading onRefresh={onRefreshKeyInspect} />
            ) : (
              ['gemini', 'groq', 'huggingface', 'facebook', 'instagram']
                .map((id) => keyInspect?.providers?.[id])
                .filter((report) => report && report.status !== 'missing')
                .map((report) => (
                  <KeyInspectCard
                    key={report.provider}
                    report={report}
                    loading={keyInspectLoading}
                    onRefresh={onRefreshKeyInspect}
                  />
                ))
            )}
            {!keyInspectLoading && !keyInspect?.providers?.gemini && (
              <KeyInspectCard
                report={{ provider: 'gemini', status: 'missing' }}
                loading={false}
                onRefresh={onRefreshKeyInspect}
              />
            )}
          </div>
        </div>
      )}

      {tab === 'schedule' && (
        <ScheduleForm mod={config.schedule || {}} patchModule={patchModule} config={config} patch={patch} />
      )}
    </div>
  );
}

/* ---- forms ---- */
function ScheduleForm({ mod, patchModule, config, patch }) {
  const t = useTranslations('aiContentStudio');
  return (
    <div className="space-y-3">
      <p className="rounded-xl bg-[#EEF2FF] px-3 py-2 text-[11px] leading-snug text-[#4338CA]">
        {t('scheduleFlowHint')}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <EnableRow enabled={mod.enabled !== false} onChange={(enabled) => patchModule('schedule', { enabled })} label={t('scheduleEnabled')} />
        <EnableRow enabled={Boolean(config.automationEnabled)} onChange={(automationEnabled) => patch({ automationEnabled })} label={t('automationMaster')} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>{t('time')}</FieldLabel>
          <TextInput className="!rounded-lg !py-2" type="time" value={mod.time || '21:00'} onChange={(e) => patchModule('schedule', { time: e.target.value })} />
        </div>
        <div>
          <FieldLabel>{t('timezone')}</FieldLabel>
          <TextInput className="!rounded-lg !py-2" value={mod.timezone || 'Africa/Cairo'} onChange={(e) => patchModule('schedule', { timezone: e.target.value })} />
        </div>
      </div>
      <div>
        <FieldLabel>{t('days')}</FieldLabel>
        <div className="flex flex-wrap gap-1">
          {DAYS.map((d) => {
            const on = (mod.days || []).includes(d.id);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  const days = new Set(mod.days || []);
                  if (on) days.delete(d.id);
                  else days.add(d.id);
                  patchModule('schedule', { days: Array.from(days) });
                }}
                className={`rounded-lg border px-2 py-1 text-[10px] font-semibold ${on ? 'border-[color-mix(in_srgb,var(--color-primary-300)_70%,transparent)] bg-[color-mix(in_srgb,var(--color-primary-50)_90%,white)] text-[var(--color-primary-700)]' : 'border-slate-200 text-slate-500'}`}
              >
                {t(`daysShort.${d.id}`)}
              </button>
            );
          })}
        </div>
      </div>
      <EnableRow enabled={Boolean(config.autoPublish)} onChange={(autoPublish) => patch({ autoPublish })} label={t('autoPublish')} />
      <details className="rounded-xl border border-slate-200 bg-white px-3 py-2">
        <summary className="cursor-pointer text-[11px] font-semibold text-slate-600">{t('scheduleAdvanced')}</summary>
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel>{t('language')}</FieldLabel>
              <SelectBox
                className="!rounded-lg"
                value={config.language}
                onChange={(language) => patch({ language })}
                options={[
                  { value: 'ar', label: t('arabic') },
                  { value: 'en', label: t('english') },
                ]}
              />
            </div>
            <div>
              <FieldLabel>{t('audience')}</FieldLabel>
              <SelectBox
                className="!rounded-lg"
                value={config.audience}
                onChange={(audience) => patch({ audience })}
                options={[
                  { value: 'Egyptian Parents', label: t('audiences.egyptianParents') },
                  { value: 'Gulf Parents', label: t('audiences.gulfParents') },
                  { value: 'General Arabic Audience', label: t('audiences.generalArabic') },
                  { value: 'Custom', label: t('audiences.custom') },
                ]}
              />
            </div>
          </div>
        </div>
      </details>
      <p className="text-[11px] leading-relaxed text-slate-500">{t('scheduleHint')}</p>
    </div>
  );
}


function TopicNodeForm(props) {
  const t = useTranslations('aiContentStudio');
  const { config, patch, runTest, tests, loadingTest, execution } = props;
  const last = execution?.research || tests.research?.result || null;
  const hits = Array.isArray(last?.hits) ? last.hits : [];
  const topicText = execution?.topic || tests.topic?.result || '';

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <p className="text-xs font-bold text-slate-900">{t('topicScrapeTitle')}</p>
          <InfoTip text={t('topicScrapeHint')} />
        </div>
        {hits.length || last?.message ? (
          <ScrapedPostsGallery hits={hits} message={last?.message} />
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-7 text-center text-[12px] leading-relaxed text-slate-500">
            {t('topicScrapeEmpty')}
          </p>
        )}
      </div>

      {topicText ? (
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">{t('lastResult')}</p>
          <p className="text-[13px] leading-relaxed text-slate-800" dir="auto">{topicText}</p>
        </div>
      ) : null}

      <ResearchPanel
        research={config.research || {}}
        patch={patch}
        runTest={runTest}
        tests={tests}
        loadingTest={loadingTest}
        execution={execution}
      />

      <details className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
        <summary className="cursor-pointer text-[12px] font-bold text-slate-700">{t('topicAiAdvanced')}</summary>
        <div className="mt-3">
          <AiModuleForm {...props} moduleKey="topic" kind="text" hideResearch hideLiveOutput />
        </div>
      </details>
    </div>
  );
}

function AiModuleForm({
  moduleKey,
  kind,
  mod,
  config,
  patch,
  patchModule,
  providerOptions,
  modelsByProvider,
  loadModels,
  secretsMeta,
  secretDrafts,
  setSecretDrafts,
  saveSecret,
  openHelp,
  runTest,
  tests,
  loadingTest,
  execution,
  hideResearch = false,
  hideLiveOutput = false,
}) {
  const t = useTranslations('aiContentStudio');
  const options = kind === 'image' ? providerOptions.image : providerOptions.text;
  const meta = providerOptions.all.find((p) => p.id === mod.provider);
  const modelsRaw = modelsByProvider[mod.provider] || [];
  const modelsUnfiltered =
    kind === 'image'
      ? modelsRaw.filter((m) => !m.modality || m.modality === 'image' || /image|banana|flux|sdxl|stable/i.test(`${m.id} ${m.label || ''}`))
      : modelsRaw.filter((m) => !m.modality || m.modality === 'text' || (!/image|banana/i.test(`${m.id} ${m.label || ''}`) && m.modality !== 'image'));
  const models = uniqueModelOptions(
    mod.provider === 'gemini' && kind === 'image'
      ? modelsUnfiltered.filter((m) => /^gemini/i.test(m.id) && /image/i.test(m.id) && !/lite/i.test(m.id))
      : modelsUnfiltered,
  ).sort((a, b) => {
    const rank = { 'gemini-3-pro-image': 0, 'gemini-2.5-flash-image': 1, 'gemini-3.1-flash-image': 2 };
    return (rank[a.id] ?? 20) - (rank[b.id] ?? 20);
  });
  const secretHint = (provider, field) => secretsMeta?.[provider]?.fields?.[field];
  const caps = meta?.capabilities;
  const [keyPromptId, setKeyPromptId] = useState(null);

  const promptForMissingKey = (providerId) => {
    const opt = options.find((p) => p.id === providerId) || providerOptions.all.find((p) => p.id === providerId);
    if (providerNeedsApiKey(opt || { id: providerId }) && !isProviderSecretConfigured(secretsMeta, providerId)) {
      setKeyPromptId(providerId);
      return true;
    }
    return false;
  };

  return (
    <div className="space-y-3">
      {!hideLiveOutput ? <NodeLiveOutput nodeId={moduleKey} execution={execution} tests={tests} /> : null}
      <EnableRow
        label={t('enabled')}
        enabled={mod.enabled !== false}
        onChange={(enabled) => patchModule(moduleKey, { enabled })}
      />

      {moduleKey === 'topic' && !hideResearch && (
        <ResearchPanel
          research={config.research || {}}
          patch={patch}
          runTest={runTest}
          tests={tests}
          loadingTest={loadingTest}
          execution={execution}
        />
      )}

      <div>
        <FieldLabel>{t('provider')}</FieldLabel>
        <ProviderSelect
          value={mod.provider}
          moduleKey={moduleKey === 'image' ? 'image' : moduleKey === 'topic' ? 'topic' : 'content'}
          options={options}
          placeholder={t('selectPlaceholder')}
          onChange={(provider) => {
            patchModule(moduleKey, { provider, model: '' });
            loadModels(provider);
            promptForMissingKey(provider);
          }}
          onHelp={(id, help) => {
            if (!promptForMissingKey(id)) openHelp(id, help);
          }}
        />
      </div>

      <div>
        <FieldLabel>{t('model')}</FieldLabel>
        {models.length ? (
          <SelectBox
            className="!rounded-lg"
            value={listedModelValue(mod.model || '', models)}
            onChange={(model) => patchModule(moduleKey, { model })}
            placeholder={t('selectModel')}
            options={models.map((m) => ({ value: m.id, label: m.label || m.id }))}
          />
        ) : (
          <TextInput className="!rounded-lg !py-2" value={mod.model || ''} onChange={(e) => patchModule(moduleKey, { model: e.target.value })} placeholder={t('modelIdPlaceholder')} />
        )}
      </div>

      {mod.provider === 'comfyui' ? (
        <div className="space-y-2">
          <FieldLabel>{t('comfyUrl')}</FieldLabel>
          <TextInput
            className="!rounded-lg !py-2"
            value={secretDrafts.comfyui?.baseUrl ?? ''}
            onChange={(e) => setSecretDrafts((p) => ({ ...p, comfyui: { ...p.comfyui, baseUrl: e.target.value } }))}
            placeholder={secretHint('comfyui', 'baseUrl')?.hint || 'http://127.0.0.1:8188'}
          />
          <FieldLabel>{t('workflowJson')}</FieldLabel>
          <TextArea
            className="!min-h-[100px] !rounded-lg font-mono text-[11px]"
            value={mod.custom?.workflowJson || ''}
            onChange={(e) => patchModule(moduleKey, { custom: { ...(mod.custom || {}), workflowJson: e.target.value } })}
          />
          <button
            type="button"
            className="text-xs font-medium text-[var(--color-primary-600)]"
            onClick={() => saveSecret('comfyui', { baseUrl: secretDrafts.comfyui?.baseUrl, checkpoint: secretDrafts.comfyui?.checkpoint })}
          >
            {t('saveComfy')}
          </button>
        </div>
      ) : providerNeedsApiKey(meta || { id: mod.provider }) ? (
        (meta?.credentialFields || [{ key: 'apiKey', label: 'API Key', secret: true }]).map((field) => {
          if (field.key === 'accountId') {
            return (
              <div key={field.key}>
                <FieldLabel>{t('accountId')}</FieldLabel>
                <TextInput
                  className="!rounded-lg !py-2"
                  value={secretDrafts.cloudflare?.accountId ?? ''}
                  onChange={(e) => setSecretDrafts((p) => ({ ...p, cloudflare: { ...p.cloudflare, accountId: e.target.value } }))}
                  placeholder={secretHint('cloudflare', 'accountId')?.hint || t('accountId')}
                />
              </div>
            );
          }
          if (!field.secret && field.key !== 'apiKey' && field.key !== 'apiToken') return null;
          const secretField = field.key === 'apiToken' ? 'apiToken' : 'apiKey';
          const provider = mod.provider;
          return (
            <SecretRow
              key={field.key}
              label={field.label}
              configured={Boolean(secretHint(provider, secretField)?.configured)}
              hint={secretHint(provider, secretField)?.hint}
              value={secretDrafts[provider]?.[secretField] || ''}
              onChange={(v) => setSecretDrafts((p) => ({ ...p, [provider]: { ...p[provider], [secretField]: v } }))}
              onSave={() => {
                const payload = { ...(secretDrafts[provider] || {}) };
                if (provider === 'cloudflare' && secretDrafts.cloudflare?.accountId) payload.accountId = secretDrafts.cloudflare.accountId;
                return saveSecret(provider, payload);
              }}
              helpSlot={
                <button type="button" onClick={() => openHelp(provider)} className="inline-flex items-center gap-1 text-[11px] text-[var(--color-primary-600)]">
                  <HelpCircle size={11} /> {t('keyHelpShort')}
                </button>
              }
            />
          );
        })
      ) : null}

      {mod.provider === 'custom' && (
        <div className="space-y-2 rounded-xl border border-dashed border-slate-200 p-2.5">
          <FieldLabel>{t('bodyTemplate')}</FieldLabel>
          <TextArea
            className="!min-h-[80px] !rounded-lg font-mono text-[11px]"
            value={config.customProvider?.bodyTemplate || ''}
            onChange={(e) => patch({ customProvider: { ...config.customProvider, bodyTemplate: e.target.value } })}
          />
          <FieldLabel>{t('responsePath')}</FieldLabel>
          <TextInput
            className="!rounded-lg !py-2"
            value={config.customProvider?.responsePath || ''}
            onChange={(e) => patch({ customProvider: { ...config.customProvider, responsePath: e.target.value } })}
          />
        </div>
      )}

      {kind === 'image' && (
        <div className="grid grid-cols-2 gap-2">
          {caps?.supportsAspectRatio !== false && (
            <div>
              <FieldLabel>{t('aspect')}</FieldLabel>
              <SelectBox
                className="!rounded-lg !py-2"
                value={mod.aspectRatio || '1:1'}
                onChange={(aspectRatio) => patchModule(moduleKey, { aspectRatio })}
                options={[
                  { value: '1:1', label: '1:1' },
                  { value: '4:5', label: '4:5' },
                  { value: '9:16', label: '9:16' },
                  { value: '16:9', label: '16:9' },
                ]}
              />
            </div>
          )}
          {caps?.supportsResolution !== false && (
            <div>
              <FieldLabel>{t('size')}</FieldLabel>
              <SelectBox
                className="!rounded-lg !py-2"
                value={mod.resolution || '1024x1024'}
                onChange={(resolution) => patchModule(moduleKey, { resolution })}
                options={[
                  { value: '1024x1024', label: '1024' },
                  { value: '768x768', label: '768' },
                  { value: '512x512', label: '512' },
                ]}
              />
            </div>
          )}
        </div>
      )}

      <div>
        <FieldLabel info={moduleKey === 'image' ? t('imageExtraPromptHint') : t('nodeInstructionsHint')}>
          {moduleKey === 'image' ? t('imageExtraPrompt') : t('nodeInstructions')}
        </FieldLabel>
        <TextArea
          className="!min-h-[88px] !rounded-lg text-[13px] leading-relaxed"
          dir={moduleKey === 'image' ? 'ltr' : 'auto'}
          value={mod.prompt || ''}
          onChange={(e) => patchModule(moduleKey, { prompt: e.target.value })}
          placeholder={
            moduleKey === 'image'
              ? t('imageExtraPromptPlaceholder')
              : moduleKey === 'content'
                ? t('contentInstructionsPlaceholder')
                : t('topicInstructionsPlaceholder')
          }
        />
      </div>

      <button
        type="button"
        onClick={() =>
          runTest(moduleKey === 'image' && mod.provider === 'comfyui' ? 'comfyui' : moduleKey, {
            provider: mod.provider,
            model: mod.model,
            prompt: mod.prompt,
            aspectRatio: mod.aspectRatio,
            resolution: mod.resolution,
            workflowJson: mod.custom?.workflowJson,
            topic: execution?.topic || tests.topic?.result,
            content: execution?.content || tests.content?.result,
          })
        }
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white"
        style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
      >
        <Play size={14} /> {t('testNode')}
      </button>
      <TestResultPanel result={tests[moduleKey] || tests.comfyui} loading={loadingTest[moduleKey] || loadingTest.comfyui} />
      <AddProviderKeyModal
        open={Boolean(keyPromptId)}
        providerId={keyPromptId}
        option={options.find((p) => p.id === keyPromptId) || providerOptions.all.find((p) => p.id === keyPromptId)}
        onClose={() => setKeyPromptId(null)}
        onSave={saveSecret}
      />
    </div>
  );
}

function SourceMultiSelect({ sources, onToggle, disabled }) {
  const t = useTranslations('aiContentStudio');
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected = RESEARCH_SOURCES.filter((s) => sources.includes(s.id));
  const label =
    selected.length === 0
      ? t('researchSourcesPlaceholder')
      : selected.map((s) => t(s.labelKey)).join(' · ');

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-full items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--color-primary-200)_55%,transparent)] bg-white px-2.5 text-start text-[12px] shadow-sm hover:border-[color-mix(in_srgb,var(--color-primary-300)_70%,transparent)] disabled:opacity-40"
      >
        <span className={`min-w-0 flex-1 truncate ${selected.length ? 'font-semibold text-slate-900' : 'text-slate-400'}`}>
          {label}
        </span>
        <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--color-primary-50)_90%,white)] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[var(--color-primary-700)]">
          {selected.length || 0}
        </span>
        <ChevronDown size={14} className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && !disabled && (
        <div className="absolute z-[90] mt-1 w-full overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--color-primary-200)_50%,transparent)] bg-white py-1 shadow-xl">
          {RESEARCH_SOURCES.map((s) => {
            const on = sources.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onToggle(s.id)}
                className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-start ${on ? 'bg-[color-mix(in_srgb,var(--color-primary-50)_85%,white)]' : 'hover:bg-slate-50'}`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    on
                      ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-500)] text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {on ? <Check size={10} /> : null}
                </span>
                <span className={`text-[12px] ${on ? 'font-semibold text-[var(--color-primary-800)]' : 'text-slate-800'}`}>
                  {t(s.labelKey)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ResearchPanel({ research, patch, runTest, loadingTest }) {
  const t = useTranslations('aiContentStudio');
  const sources = Array.isArray(research.sources) ? research.sources : [];

  const toggleSource = (id) => {
    const set = new Set(sources);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    const next = Array.from(set);
    patch({ research: { ...research, sources: next.length ? next : ['google'] } });
  };

  return (
    <div className="space-y-3 rounded-2xl border border-[color-mix(in_srgb,var(--color-primary-200)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-primary-50)_55%,white)] p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1">
          <p className="text-xs font-bold text-slate-900">{t('researchTitle')}</p>
          <InfoTip text={t('researchHint')} />
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
            research.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
          }`}
        >
          {research.enabled ? t('researchOn') : t('researchOff')}
        </span>
      </div>

      <EnableRow
        label={t('researchEnable')}
        enabled={Boolean(research.enabled)}
        onChange={(enabled) => patch({ research: { ...research, enabled } })}
      />

      <div className={!research.enabled ? 'pointer-events-none opacity-45' : ''}>
        <FieldLabel info={t('researchSourcesHint')}>{t('researchSourcesLabel')}</FieldLabel>
        <SourceMultiSelect sources={sources} onToggle={toggleSource} disabled={!research.enabled} />
      </div>

      <div className={!research.enabled ? 'pointer-events-none opacity-45' : ''}>
        <FieldLabel info={t('researchBriefHint')}>{t('researchBrief')}</FieldLabel>
        <TextArea
          className="!min-h-[72px] !rounded-lg text-[13px] leading-relaxed"
          dir="auto"
          disabled={!research.enabled}
          value={research.brief || ''}
          onChange={(e) => patch({ research: { ...research, brief: e.target.value } })}
          placeholder={t('researchBriefPlaceholder')}
        />
      </div>

      <button
        type="button"
        disabled={!research.enabled || loadingTest.research}
        onClick={() =>
          runTest('research', {
            brief: research.brief,
            sources: research.sources,
            maxResults: research.maxResults || 10,
          })
        }
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
      >
        <Play size={12} /> {loadingTest.research ? t('running') : t('researchTest')}
      </button>
    </div>
  );
}

function MetaForm({
  platform,
  mod,
  patchModule,
  secretsMeta,
  secretDrafts,
  setSecretDrafts,
  saveSecret,
  runTest,
  tests,
  loadingTest,
  execution,
  publish,
  running,
}) {
  const t = useTranslations('aiContentStudio');
  const isFb = platform === 'facebook';
  const idField = isFb ? 'pageId' : 'igUserId';
  const secretHint = secretsMeta?.[platform]?.fields?.accessToken;
  const browserMode = (mod.publishMode || 'browser') !== 'api';
  const caption = String(execution?.content || '').trim();
  const imageUrl = execution?.finalImageUrl || execution?.imageUrl || '';
  const openedRef = useRef(false);

  const openVisibleWindow = (auto = false) => {
    runTest(platform, {
      [idField]: mod[idField],
      caption,
      content: caption,
      imageUrl: imageUrl || undefined,
    });
    if (!auto) toast.success(t('fbWindowOpening'));
  };

  useEffect(() => {
    if (!browserMode) return undefined;
    if (openedRef.current) return undefined;
    openedRef.current = true;
    const tmr = setTimeout(() => openVisibleWindow(true), 400);
    return () => clearTimeout(tmr);
    // Open once when this node panel mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browserMode]);

  return (
    <div className="space-y-3">
      <EnableRow enabled={Boolean(mod.enabled)} onChange={(enabled) => patchModule(platform, { enabled })} label={t('enabled')} />
      <div className="space-y-2 rounded-xl border border-[color-mix(in_srgb,var(--color-primary-200)_50%,transparent)] bg-[color-mix(in_srgb,var(--color-primary-50)_55%,white)] p-3">
        <p className="text-xs font-bold text-slate-900">{t('fbNoTokenTitle')}</p>
        <p className="text-[12px] leading-relaxed text-slate-600">{t('fbNoTokenBody')}</p>
        <p className="text-[11px] leading-relaxed text-slate-500">{t('fbNoTokenSteps')}</p>
        <p className="text-[11px] leading-snug text-slate-500">{isFb ? t('fbBrowserHint') : t('igBrowserHint')}</p>
        <div className="flex gap-1.5">
          {[
            { id: 'browser', label: t('fbModeBrowser') },
            { id: 'api', label: t('fbModeApi') },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => patchModule(platform, { publishMode: opt.id })}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                (mod.publishMode || 'browser') === opt.id
                  ? 'border-[var(--color-primary-400)] bg-white text-[var(--color-primary-800)]'
                  : 'border-slate-200 text-slate-500'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {browserMode && (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{t('fbPostPreview')}</p>
          {caption ? (
            <p className="max-h-28 overflow-auto whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800" dir="auto">
              {caption}
            </p>
          ) : (
            <p className="text-[12px] text-slate-500">{t('fbNoResultYet')}</p>
          )}
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="max-h-40 w-full rounded-lg border border-slate-200 object-cover" />
          ) : null}
        </div>
      )}

      {!browserMode && (
        <>
      <div>
        <FieldLabel>{isFb ? t('pageId') : t('igAccountId')}</FieldLabel>
        <TextInput
          className="!rounded-lg !py-2"
          value={mod[idField] || ''}
          onChange={(e) => patchModule(platform, { [idField]: e.target.value })}
        />
      </div>
      <SecretRow
        label={t('accessToken')}
        configured={Boolean(secretHint?.configured)}
        hint={secretHint?.hint}
        value={secretDrafts[platform]?.accessToken || ''}
        onChange={(v) => setSecretDrafts((p) => ({ ...p, [platform]: { ...p[platform], accessToken: v } }))}
        onSave={() =>
          saveSecret(platform, {
            accessToken: secretDrafts[platform]?.accessToken,
            [idField]: mod[idField],
          })
        }
      />
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
        <ol className="list-decimal space-y-1 ps-3.5">
          {(isFb ? META_SETUP_STEPS.facebook : META_SETUP_STEPS.instagram).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <a
          href={isFb ? 'https://developers.facebook.com/docs/pages/publishing/' : 'https://developers.facebook.com/docs/instagram-api/guides/content-publishing/'}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 font-medium text-[var(--color-primary-600)]"
        >
          {t('metaDocs')} <ExternalLink size={11} />
        </a>
      </div>
        </>
      )}
      {browserMode ? (
        <button
          type="button"
          disabled={loadingTest[platform]}
          onClick={() => openVisibleWindow(false)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
        >
          <MonitorPlay size={15} /> {loadingTest[platform] ? t('fbWindowOpening') : isFb ? t('fbOpenWindow') : t('igOpenWindow')}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => runTest(platform, { [idField]: mod[idField] })}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
        >
          {t('testConnection')}
        </button>
      )}
      {browserMode && caption ? (
        <button
          type="button"
          disabled={running}
          onClick={() => {
            if (!mod.enabled) patchModule(platform, { enabled: true });
            publish?.({ [platform]: true });
          }}
          className="w-full rounded-xl border border-slate-200 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {isFb ? t('publishFacebook') : t('publishInstagram')}
        </button>
      ) : null}
      {isFb && !browserMode && (
        <button
          type="button"
          onClick={async () => {
            try {
              const { data } = await studioApi.facebookTestPublish('So7baFit studio test post');
              if (data?.ok === false) toast.error(data.message || t('publishTestPost'));
              else toast.success(t('publishTestOk'));
            } catch (e) {
              toast.error(e?.response?.data?.message || e.message);
            }
          }}
          className="w-full rounded-xl border border-slate-200 py-2 text-sm font-semibold"
        >
          {t('publishTestPost')}
        </button>
      )}
      <TestResultPanel result={tests[platform]} loading={loadingTest[platform]} />
    </div>
  );
}

function PreviewPanel({ execution, publish, retryModule, running }) {
  const t = useTranslations('aiContentStudio');
  if (!execution) {
    return <p className="text-sm text-slate-500">{t('previewEmpty')}</p>;
  }
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-primary-200)_50%,transparent)] bg-[color-mix(in_srgb,var(--color-primary-50)_60%,white)] px-3 py-2 text-xs font-semibold text-slate-700">
        {t('sessionStatus')}: {['COMPLETED', 'FAILED', 'RUNNING'].includes(execution.status) ? t(`status.${execution.status}`) : execution.status}
      </div>
      {Array.isArray(execution.research?.hits) && execution.research.hits.length > 0 && (
        <ScrapedPostsGallery hits={execution.research.hits} message={execution.research.message} compact />
      )}
      <div>
        <FieldLabel>{t('sessionTopic')}</FieldLabel>
        <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-2.5 text-sm" dir="auto">{execution.topic || '—'}</p>
      </div>
      <div>
        <FieldLabel>{t('nodes.content.label')}</FieldLabel>
        <p className="max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-2.5 text-sm leading-relaxed" dir="auto">{execution.content || '—'}</p>
      </div>
      {(execution.finalImageUrl || execution.imageUrl) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={execution.finalImageUrl || execution.imageUrl} alt="" className="rounded-xl border border-slate-200" />
      )}
      {execution.errors?.length > 0 && (
        <div className="space-y-2">
          {execution.errors.map((err, i) => (
            <StudioErrorCard
              key={`${err.module}-${i}`}
              error={err}
              retrying={running}
              onRetry={() => retryModule(err.module)}
            />
          ))}
        </div>
      )}
      {execution.content && (
        <div className="grid grid-cols-1 gap-2">
          <button type="button" disabled={running} onClick={() => publish({ facebook: true })} className="rounded-xl border border-slate-200 py-2 text-sm font-semibold">{t('publishFacebook')}</button>
          <button type="button" disabled={running} onClick={() => publish({ instagram: true })} className="rounded-xl border border-slate-200 py-2 text-sm font-semibold">{t('publishInstagram')}</button>
          <button
            type="button"
            disabled={running}
            onClick={() => publish({ facebook: true, instagram: true })}
            className="rounded-xl py-2 text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
          >
            {t('publishBoth')}
          </button>
        </div>
      )}
    </div>
  );
}

function SessionsPanel({ sessions, onOpenSession, onRefresh, locale }) {
  const t = useTranslations('aiContentStudio');

  useEffect(() => {
    onRefresh?.();
  }, [onRefresh]);

  if (!sessions) return <p className="text-sm text-slate-500">{t('sessionsLoading')}</p>;

  return (
    <div className="space-y-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-[11px] text-slate-500">{t('sessionsTitle')}</p>
        <button
          type="button"
          onClick={() => onRefresh?.()}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw size={11} /> {t('refresh')}
        </button>
      </div>
      {!sessions.length ? (
        <p className="text-sm text-slate-500">{t('sessionsEmpty')}</p>
      ) : (
        sessions.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onOpenSession?.(row.id)}
            className="w-full rounded-2xl border border-[color-mix(in_srgb,var(--color-primary-100)_80%,transparent)] bg-white px-3 py-2.5 text-start shadow-sm transition hover:border-[color-mix(in_srgb,var(--color-primary-300)_55%,transparent)] hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
              <span>{new Date(row.createdAt).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB')}</span>
              <span className={row.status === 'COMPLETED' ? 'font-semibold text-emerald-600' : row.status === 'FAILED' ? 'font-semibold text-rose-600' : ''}>
                {row.status === 'COMPLETED' ? '✓ ' : row.status === 'FAILED' ? '✗ ' : ''}
                {['COMPLETED', 'FAILED', 'RUNNING'].includes(row.status) ? t(`status.${row.status}`) : row.status}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-slate-800" dir="auto">{row.topic || '—'}</p>
            <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] text-slate-500">
              <span>
                {t('sessionFb')}: {row.facebookStatus || '—'}
              </span>
              <span>
                {t('sessionIg')}: {row.instagramStatus || '—'}
              </span>
              <span className="ms-auto font-semibold text-[var(--color-primary-600)]">{t('sessionOpen')}</span>
            </div>
          </button>
        ))
      )}
    </div>
  );
}

