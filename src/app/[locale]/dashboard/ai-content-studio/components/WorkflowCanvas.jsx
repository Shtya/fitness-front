'use client';

import { useState } from 'react';
import {
  Clock,
  Lightbulb,
  FileText,
  Image as ImageIcon,
  Palette,
  Facebook,
  Instagram,
  Eye,
  History,
  XCircle,
  Loader2,
  Settings,
  Lock,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  getNodeOutput,
  NodeResultModal,
} from './NodeResult';
import { STUDIO, FourPointStar } from './studio-theme';
import { InfoTip } from './studio-ui';
import { prettyStudioError } from '@/lib/ai-content-studio/studio-error-map';

export const WORKFLOW_NODE_DEFS = [
  { id: 'schedule', icon: Clock, configKey: 'schedule' },
  { id: 'topic', icon: Lightbulb, configKey: 'topic', kind: 'text' },
  { id: 'content', icon: FileText, configKey: 'content', kind: 'text' },
  { id: 'image', icon: ImageIcon, configKey: 'image', kind: 'image' },
  { id: 'design', icon: Palette, configKey: 'design' },
  { id: 'facebook', icon: Facebook, configKey: 'facebook' },
  { id: 'instagram', icon: Instagram, configKey: 'instagram' },
];

/** Re-export for NodeInspector */
export const WORKFLOW_NODES = WORKFLOW_NODE_DEFS;

const NODE_ICON_STYLE = {
  topic: { background: 'linear-gradient(145deg, #7c5cff 0%, #b56bff 100%)' },
  content: { background: 'linear-gradient(145deg, #3b82f6 0%, #6366f1 100%)' },
  image: { background: 'linear-gradient(145deg, #14b8a6 0%, #2dd4bf 100%)' },
  design: { background: 'linear-gradient(145deg, #fb7185 0%, #f97316 100%)' },
};

const STATUS_MAP = {
  schedule: ['RUNNING', 'TOPIC_GENERATED', 'CONTENT_GENERATED', 'IMAGE_GENERATED', 'DESIGN_GENERATED', 'FACEBOOK_PUBLISHED', 'INSTAGRAM_PUBLISHED', 'COMPLETED'],
  topic: ['TOPIC_GENERATED', 'CONTENT_GENERATED', 'IMAGE_GENERATED', 'DESIGN_GENERATED', 'FACEBOOK_PUBLISHED', 'INSTAGRAM_PUBLISHED', 'COMPLETED'],
  content: ['CONTENT_GENERATED', 'IMAGE_GENERATED', 'DESIGN_GENERATED', 'FACEBOOK_PUBLISHED', 'INSTAGRAM_PUBLISHED', 'COMPLETED'],
  image: ['IMAGE_GENERATED', 'DESIGN_GENERATED', 'FACEBOOK_PUBLISHED', 'INSTAGRAM_PUBLISHED', 'COMPLETED'],
  design: ['DESIGN_GENERATED', 'FACEBOOK_PUBLISHED', 'INSTAGRAM_PUBLISHED', 'COMPLETED'],
  facebook: ['FACEBOOK_PUBLISHED', 'INSTAGRAM_PUBLISHED', 'COMPLETED'],
  instagram: ['INSTAGRAM_PUBLISHED', 'COMPLETED'],
};

export function nodeRuntimeState(nodeId, execution, running = false) {
  if (!execution?.status && !running) return 'idle';
  const status = execution?.status || (running ? 'RUNNING' : null);
  if (!status) return 'idle';

  if (status === 'FAILED' && execution?.errors?.some((e) => e.module === nodeId)) return 'error';
  if (nodeId === 'facebook') {
    if (execution?.facebookStatus === 'published') return 'done';
    if (execution?.facebookStatus === 'failed') return 'error';
  }
  if (nodeId === 'instagram') {
    if (execution?.instagramStatus === 'published') return 'done';
    if (execution?.instagramStatus === 'failed') return 'error';
  }
  if (STATUS_MAP[nodeId]?.includes(status) && status !== 'RUNNING') return 'done';
  if (status === 'COMPLETED') return STATUS_MAP[nodeId] ? 'done' : 'idle';

  const inFlight = status === 'RUNNING' || running || ['TOPIC_GENERATED', 'CONTENT_GENERATED', 'IMAGE_GENERATED'].includes(status);
  if (inFlight) {
    if (nodeId === 'schedule') {
      if (!execution?.topic) return status === 'RUNNING' || running ? 'done' : 'idle';
      return 'done';
    }
    if (nodeId === 'topic') {
      if (execution?.topic) return 'done';
      return 'active';
    }
    if (nodeId === 'content') {
      if (execution?.content) return 'done';
      const researchBusy =
        running &&
        execution?.topic &&
        execution?.research?.enabled !== false &&
        !execution?.research?.ran &&
        !(execution?.research?.hits || []).length;
      if (execution?.topic && !researchBusy) return 'active';
      return 'idle';
    }
    if (nodeId === 'image') {
      if (execution?.imageUrl) return 'done';
      if (execution?.content) return 'active';
      return 'idle';
    }
  }
  return 'idle';
}

function isEnabled(config, node) {
  if (node.id === 'schedule') return config?.schedule?.enabled !== false;
  const mod = config?.[node.configKey];
  if (mod && typeof mod.enabled === 'boolean') return mod.enabled;
  return true;
}

export function WorkflowCanvas({
  config,
  selectedId,
  onSelect,
  execution,
  tests,
  running = false,
  onSelectPreview,
  onSelectSessions,
  previewOpen,
  sessionsOpen,
  onManualTopicChange,
  onTopicSourceChange,
  onSubmitTopic,
  onGenerateTopic,
  generatingTopic = false,
  onToggleEnabled,
  trendingTopics = [],
  trendingLoading = false,
  onOpenTrending,
  onSelectTrendingTopic,
  onPublish,
  onPreview,
  facebookConnected = false,
  instagramConnected = false,
}) {
  const t = useTranslations('aiContentStudio');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const [resultNode, setResultNode] = useState(null);

  const openResult = (e, node) => {
    e.stopPropagation();
    setResultNode(node);
  };

  const viewing = resultNode
    ? {
        node: resultNode,
        output: getNodeOutput(resultNode.id, execution, tests),
        logs: (execution?.logs || []).filter(
          (l) => !l.module || l.module === resultNode.id || String(l.message || '').toLowerCase().includes(resultNode.id),
        ),
      }
    : null;

  const main = WORKFLOW_NODE_DEFS.filter((n) => ['topic', 'content', 'image'].includes(n.id));
  const publish = WORKFLOW_NODE_DEFS.filter((n) => ['facebook', 'instagram'].includes(n.id));

  const activeLabel = (() => {
    const active = WORKFLOW_NODE_DEFS.find((n) => nodeRuntimeState(n.id, execution, running) === 'active');
    return active ? t(`nodes.${active.id}.label`) : null;
  })();

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-5 py-6 sm:px-10">
        <div className="mx-auto w-full max-w-[1180px]">
          <div className="relative mb-6 min-h-[120px]">
            <div className="pt-4 text-center">
               
              <p
                className="bg-clip-text text-[26px] font-black leading-[1.05] tracking-[-0.045em] text-transparent sm:text-[32px]"
                style={{ backgroundImage: STUDIO.gradient }}
              >
                {t('pipelineHint')}
              </p>
              <p className="mx-auto mt-2 max-w-md text-[13px] font-medium leading-snug text-[#6B7280]">{t('pipelineSubhint')}</p>
              {(running || execution?.status === 'RUNNING') && activeLabel ? (
                <div className="mt-3 inline-flex items-center gap-2 rounded-[10px] border border-[#C7D2FE] bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#4F46E5]" style={{ boxShadow: STUDIO.shadow3d }}>
                  <Loader2 size={13} className="animate-spin" />
                  {t('runningOverlay')} — {activeLabel}
                </div>
              ) : null}
            </div>
            <div className={`pointer-events-none absolute top-0 hidden lg:block ${isRtl ? 'start-0' : 'end-0'}`}>
              <AiGlassCube />
            </div>
          </div>

          <div className="mx-auto mb-10 w-full max-w-[860px]">
            <TopicChatComposer
              value={config?.manualTopic || ''}
              dailyTrendTopic={config?.dailyTrendTopic || ''}
              dailyTrendEnabled={config?.dailyTrendEnabled !== false}
              topicSource={config?.topicSource || 'ai'}
              onTopicSourceChange={onTopicSourceChange}
              onChange={(value) => {
                onManualTopicChange?.(value);
                onTopicSourceChange?.('manual');
              }}
              onSubmit={onSubmitTopic}
              onGenerate={onGenerateTopic}
              running={running}
              generating={generatingTopic}
              title={t('topicChatTitle')}
              trendBadge={t('topicChatTrendBadge')}
              placeholder={t('topicChatPlaceholder')}
              hint={t('topicChatHint')}
              submitLabel={t('topicChatSubmit')}
              generateLabel={t('generateTopic')}
              lockLabel={t('topicModeLock')}
              aiLabel={t('topicModeAi')}
              trendingLabel={t('trendingToday')}
              trendingTopics={trendingTopics}
              trendingLoading={trendingLoading}
              onOpenTrending={onOpenTrending}
              onSelectTrendingTopic={onSelectTrendingTopic}
            />
          </div>

          {(running || execution?.status === 'RUNNING' || execution?.topic || execution?.content) ? (
            <>
          <SectionRail label={t('pipelineNodesLabel')} />

          <div className="mb-8 flex flex-wrap items-stretch justify-center gap-y-4">
            {main.map((node, index, arr) => {
              const runtime = nodeRuntimeState(node.id, execution, running);
              const output = getNodeOutput(node.id, execution, tests);
              return (
                <div key={node.id} className="flex items-center">
                  <PipelineNodeCard
                    node={node}
                    label={t(`nodes.${node.id}.label`)}
                    subtitle={t(`nodes.${node.id}.subtitle`)}
                    info={t(`nodes.${node.id}.info`)}
                    selected={selectedId === node.id}
                    enabled={isEnabled(config, node)}
                    runtime={runtime}
                    output={output}
                    onClick={() => onSelect(node.id)}
                    onViewResult={(e) => openResult(e, node)}
                    viewLabel={t('view')}
                  />
                  {index < arr.length - 1 ? <DottedArrow rtl={isRtl} /> : null}
                </div>
              );
            })}
          </div>

          <SectionRail label={t('publish')} />

          <div className="mb-8 flex flex-wrap items-stretch justify-center gap-4">
            {publish.map((node) => {
              const runtime = nodeRuntimeState(node.id, execution, running);
              const output = getNodeOutput(node.id, execution, tests);
              return (
                  <PublishCard
                    key={node.id}
                    node={node}
                    label={t(`nodes.${node.id}.label`)}
                    subtitle={t(`nodes.${node.id}.subtitle`)}
                    selected={selectedId === node.id}
                    enabled={isEnabled(config, node)}
                    runtime={runtime}
                    output={output}
                    caption={execution?.content || ''}
                    imageUrl={execution?.finalImageUrl || execution?.imageUrl || ''}
                    connected={node.id === 'facebook' ? facebookConnected : instagramConnected}
                    publishedId={node.id === 'facebook' ? execution?.facebookPostId : execution?.instagramMediaId}
                    onOpen={() => onSelect(node.id)}
                    onPreview={onPreview}
                    onPublish={() => onPublish?.({ [node.id]: true })}
                    onToggle={(enabled) => onToggleEnabled?.(node.configKey, enabled)}
                    labels={{
                      preview: t('previewAction'),
                      edit: t('editAction'),
                      publish: t('publishNow'),
                      notConnected: t('notConnected'),
                      ready: t('publishReady'),
                      publishing: t('running'),
                      published: t('published'),
                      failed: t('failed'),
                    }}
                  />
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pb-6">
            <UtilityChip
              icon={Eye}
              label={t('fullPreview')}
              subtitle={t('fullPreviewSub')}
              active={previewOpen}
              onClick={onSelectPreview}
            />
            <UtilityChip
              icon={History}
              label={t('sessions')}
              subtitle={t('sessionsSub')}
              active={sessionsOpen}
              onClick={onSelectSessions}
            />
          </div>
            </>
          ) : (
            <p className="pb-8 text-center text-[13px] text-[#9CA3AF]">{t('runToReveal')}</p>
          )}
        </div>
      </div>

      <NodeResultModal
        open={Boolean(viewing)}
        onClose={() => setResultNode(null)}
        nodeLabel={viewing ? t(`nodes.${viewing.node.id}.label`) : ''}
        output={viewing?.output}
        logs={viewing?.logs}
      />
    </div>
  );
}

function SectionRail({ label }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="h-px flex-1 bg-[#E5E7EB]" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#818CF8]">{label}</span>
      <span className="h-px flex-1 bg-[#E5E7EB]" />
    </div>
  );
}

function AiGlassCube() {
  return (
    <div className="relative h-40 w-40" aria-hidden>
      <span className="absolute left-[12%] top-[28%] h-1.5 w-1.5 rounded-full bg-[#93C5FD]" />
      <span className="absolute right-[18%] top-[18%] h-1 w-1 rounded-full bg-[#C4B5FD]" />
      <span className="absolute bottom-[22%] right-[30%] h-1 w-1 rounded-full bg-[#93C5FD]" />
      <div className="absolute left-1/2 top-[58%] h-8 w-[4.5rem] -translate-x-1/2 rounded-full bg-[#93C5FD]/30 blur-md" />
      <div className="absolute left-1/2 top-1/2 h-[8.75rem] w-[8.75rem] -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-[#93C5FD]/55" />
      <div className="absolute left-1/2 top-1/2 h-[6.6rem] w-[6.6rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#BFDBFE]/80" />
      <div
        className="absolute left-1/2 top-[46%] h-[4.55rem] w-[4.55rem] -translate-x-1/2 -translate-y-1/2"
        style={{
          transform: 'translate(-50%, -50%) rotateX(18deg) rotateZ(-18deg)',
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          className="flex h-full w-full items-center justify-center rounded-[14px]"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(191,219,254,0.8) 42%, rgba(129,140,248,0.55) 100%)',
            boxShadow: '0 18px 36px -16px rgba(99,102,241,0.55), inset 0 1px 0 rgba(255,255,255,0.95)',
            border: '1px solid rgba(255,255,255,0.85)',
          }}
        >
          <span className="text-[15px] font-black tracking-[0.2em] text-[#4F46E5]">AI</span>
        </div>
      </div>
    </div>
  );
}

function TopicChatComposer({
  value,
  dailyTrendTopic,
  dailyTrendEnabled,
  topicSource = 'ai',
  onTopicSourceChange,
  onChange,
  onSubmit,
  onGenerate,
  running,
  generating,
  title,
  trendBadge,
  placeholder,
  hint,
  submitLabel,
  generateLabel,
  lockLabel,
  aiLabel,
  trendingLabel,
  trendingTopics = [],
  trendingLoading = false,
  onOpenTrending,
  onSelectTrendingTopic,
}) {
  const [openTrends, setOpenTrends] = useState(false);
  const text = value || '';
  const isTrend = dailyTrendEnabled && dailyTrendTopic && text.trim() === String(dailyTrendTopic).trim();
  const busy = running || generating;
  const locked = topicSource === 'manual';

  const submit = () => {
    if (busy) return;
    if (locked && !String(text).trim()) return;
    onSubmit?.();
  };

  return (
    <div
      className="relative rounded-[24px] border bg-white px-7 pb-7 pt-7"
      style={{ borderColor: STUDIO.border, boxShadow: STUDIO.shadowCard }}
    >
      <span
        aria-hidden
        className="absolute left-1/2 top-0 h-[5px] w-[10%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: STUDIO.gradient, boxShadow: '0 4px 10px -4px #6366F1' }}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <FourPointStar size={14} className="text-[#6366F1]" />
        <p className="text-[16px] font-bold tracking-tight text-[#111827]">{title}</p>
        {isTrend ? (
          <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-bold text-[#4F46E5]">{trendBadge}</span>
        ) : null}
        <div className="relative ms-auto">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setOpenTrends((v) => !v);
              onOpenTrending?.();
            }}
            className="inline-flex h-8 items-center gap-1.5 border bg-white px-3 text-[11px] font-semibold text-[#4338CA] hover:bg-[#EEF2FF] disabled:opacity-50"
            style={{ borderColor: STUDIO.border, borderRadius: STUDIO.btnRadius, boxShadow: STUDIO.shadow3d }}
          >
            {trendingLoading ? <Loader2 size={12} className="animate-spin" /> : <TrendingUp size={12} />}
            {trendingLabel}
          </button>
          {openTrends ? (
            <div className="absolute end-0 top-[110%] z-30 w-[min(420px,calc(100vw-3rem))] overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_18px_40px_-20px_rgba(15,23,42,0.35)]">
              <div className="max-h-72 overflow-auto p-1.5">
                {trendingLoading && !trendingTopics.length ? (
                  <p className="px-3 py-4 text-center text-[12px] text-slate-500">…</p>
                ) : (
                  trendingTopics.map((item, i) => (
                    <button
                      key={`${item.title}-${i}`}
                      type="button"
                      className="block w-full rounded-xl px-3 py-2.5 text-start hover:bg-[#EEF2FF]"
                      onClick={() => {
                        onSelectTrendingTopic?.(item.title);
                        setOpenTrends(false);
                      }}
                    >
                      <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-[#111827]" dir="auto">
                        {item.title}
                      </span>
                      {item.angle ? (
                        <span className="mt-0.5 block text-[11px] text-[#9CA3AF]" dir="auto">{item.angle}</span>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative">
        <div className="absolute start-[10px] top-0 z-10 flex -translate-y-1/2 gap-1.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => onTopicSourceChange?.('manual')}
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold shadow-sm ${
              locked ? 'border-transparent text-white' : 'border-white bg-[#F3F4F6] text-[#6B7280] hover:bg-slate-200'
            }`}
            style={locked ? { background: STUDIO.gradient } : undefined}
          >
            {lockLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onTopicSourceChange?.('ai')}
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold shadow-sm ${
              !locked ? 'border-transparent text-white' : 'border-white bg-[#F3F4F6] text-[#6B7280] hover:bg-slate-200'
            }`}
            style={!locked ? { background: STUDIO.gradient } : undefined}
          >
            {aiLabel}
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          rows={3}
          dir="auto"
          disabled={busy}
          className="min-h-[108px] w-full resize-none rounded-2xl border bg-white px-4 py-5 text-start text-[15px] leading-6 text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#A5B4FC] focus:outline-none focus:ring-2 focus:ring-[#E0E7FF] disabled:opacity-60"
          style={{ borderColor: STUDIO.border }}
        />

        <div className="mt-4 flex items-end justify-between gap-3 px-0.5">
          <p className="flex min-w-0 flex-1 items-start gap-1.5 pe-2 text-[11px] leading-snug text-[#6B7280]">
            <Lock size={12} className="mt-0.5 shrink-0 text-[#3B82F6]" />
            <span className="line-clamp-2">{hint}</span>
            <InfoTip text={hint} className="mt-0.5 shrink-0" />
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onTopicSourceChange?.('ai');
                onGenerate?.();
              }}
              disabled={busy}
              className="inline-flex h-8 items-center gap-1.5 border bg-white px-3 text-[11px] font-semibold text-[#3B82F6] hover:bg-slate-50 disabled:opacity-50"
              style={{ borderColor: STUDIO.border, borderRadius: STUDIO.btnRadius, boxShadow: STUDIO.shadow3d }}
            >
              {generating ? <Loader2 size={12} className="animate-spin" /> : <FourPointStar size={10} />}
              {generateLabel}
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={running || (locked && !String(text).trim())}
              className="inline-flex h-8 items-center border border-transparent px-4 text-[11px] font-bold text-white disabled:opacity-50"
              style={{ background: STUDIO.gradient, borderRadius: STUDIO.btnRadius, boxShadow: STUDIO.shadow3dPrimary }}
            >
              {running ? <Loader2 size={12} className="me-1.5 animate-spin" /> : null}
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DottedArrow({ rtl }) {
  const Chevron = rtl ? ChevronLeft : ChevronRight;
  return (
    <div className="mx-1 hidden w-14 shrink-0 items-center sm:flex" aria-hidden>
      <div className="h-0 flex-1 border-t-[1.5px] border-dashed border-[#C7D2FE]" />
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#C7D2FE] bg-[#EEF2FF]">
        <Chevron size={12} className="text-[#6366F1]" strokeWidth={2.4} />
      </span>
      <div className="h-0 flex-1 border-t-[1.5px] border-dashed border-[#C7D2FE]" />
    </div>
  );
}

function PipelineNodeCard({
  node,
  label,
  subtitle,
  info,
  selected,
  enabled,
  runtime,
  output,
  onClick,
  onViewResult,
  viewLabel,
}) {
  const t = useTranslations('aiContentStudio');
  const Icon = node.icon;
  const hasError = output?.type === 'error' || runtime === 'error';
  const iconStyle = NODE_ICON_STYLE[node.id] || NODE_ICON_STYLE.topic;
  const errorCaption = hasError && output?.error ? prettyStudioError({ module: node.id, ...output.error }, t).title : '';

  return (
    <div className={`relative w-[210px] shrink-0 ${selected || runtime === 'active' ? 'z-10' : ''}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        className={`w-full cursor-pointer rounded-[20px] border bg-white p-5 text-start transition hover:shadow-md ${
          selected
            ? 'border-[#C4B5FD] ring-2 ring-[#DDD6FE]'
            : hasError
              ? 'border-rose-200'
              : runtime === 'active'
                ? 'border-[#C4B5FD] ring-2 ring-[#EDE9FE]'
                : ''
        } ${!enabled ? 'opacity-50' : ''}`}
        style={{
          borderColor: selected || runtime === 'active' || hasError ? undefined : STUDIO.border,
          boxShadow: STUDIO.shadowCard,
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] text-white"
            style={{ ...iconStyle, boxShadow: '0 8px 16px -8px rgba(15,23,42,0.35)' }}
          >
            {runtime === 'active' ? <Loader2 size={20} className="animate-spin" /> : <Icon size={20} />}
          </span>
          <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1">
            <div className="truncate text-[15px] font-bold leading-tight text-[#1a1a1a]">{label}</div>
            <InfoTip text={info} />
              {hasError ? <XCircle size={14} className="shrink-0 text-rose-500" /> : null}
              <button
                type="button"
                title={viewLabel}
                onClick={(e) => {
                  e.stopPropagation();
                  onViewResult(e);
                }}
                className="inline-flex h-4 w-4 items-center justify-center text-[#9CA3AF] hover:text-[#6366F1]"
              >
                <Eye size={12} />
              </button>
            </div>
            <p className={`mt-0.5 text-[12px] leading-tight ${hasError ? 'line-clamp-2 text-rose-600' : 'truncate text-[#9CA3AF]'}`}>
              {errorCaption || subtitle}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PublishCard({
  node,
  label,
  selected,
  enabled,
  runtime,
  output,
  caption,
  imageUrl,
  connected,
  publishedId,
  onOpen,
  onPreview,
  onPublish,
  onToggle,
  labels,
}) {
  const isFb = node.id === 'facebook';
  const hasError = output?.type === 'error' || runtime === 'error';
  const statusLabel = hasError
    ? labels.failed
    : runtime === 'done' || publishedId
      ? labels.published
      : runtime === 'active'
        ? labels.publishing
        : connected
          ? labels.ready
          : labels.notConnected;

  return (
    <div
      className={`w-[min(340px,100%)] overflow-hidden rounded-[16px] border bg-white ${
        selected ? 'border-[#C4B5FD] ring-2 ring-[#EDE9FE]' : ''
      }`}
      style={{ borderColor: selected ? undefined : STUDIO.border, boxShadow: STUDIO.shadowCard }}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-36 w-full object-cover" />
      ) : (
        <div className="flex h-24 items-center justify-center bg-[#F3F4F6] text-[11px] text-[#9CA3AF]">{label}</div>
      )}
      <div className="flex items-start gap-3 px-4 py-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white ${isFb ? 'bg-[#1877F2]' : ''}`}
          style={isFb ? undefined : { background: 'linear-gradient(135deg, #f58529, #dd2a7b, #8134af)' }}
        >
          {isFb ? <Facebook size={18} fill="currentColor" /> : <Instagram size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[14px] font-bold text-[#1a1a1a]">{label}</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              hasError ? 'bg-rose-50 text-rose-600' : runtime === 'done' || publishedId ? 'bg-emerald-50 text-emerald-700' : connected ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {statusLabel}
            </span>
          </div>
          <p className="mt-1 line-clamp-3 text-[12px] leading-snug text-[#6B7280]" dir="auto">
            {caption || '—'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 border-t border-[#F3F4F6] px-3 py-2">
        <button type="button" onClick={onPreview} className="rounded-lg px-2 py-1 text-[11px] font-semibold text-[#6B7280] hover:bg-slate-50">
          {labels.preview}
        </button>
        <button type="button" onClick={onOpen} className="rounded-lg px-2 py-1 text-[11px] font-semibold text-[#6B7280] hover:bg-slate-50">
          {labels.edit}
        </button>
        <button
          type="button"
          onClick={onPublish}
          disabled={!connected || !caption}
          className="ms-auto rounded-[8px] px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-40"
          style={{ background: STUDIO.gradient }}
        >
          {labels.publish}
        </button>
        <button
          type="button"
          onClick={() => onToggle?.(!enabled)}
          className={`relative h-[18px] w-[32px] rounded-full transition ${enabled ? 'bg-[#6366F1]' : 'bg-slate-300'}`}
          aria-pressed={enabled}
          title="Auto-publish"
        >
          <span className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow transition ${enabled ? 'start-[16px]' : 'start-[2px]'}`} />
        </button>
      </div>
    </div>
  );
}

function UtilityChip({ icon: Icon, label, subtitle, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex w-fit items-center gap-2.5 border px-3.5 py-2 text-start transition ${
        active ? 'border-transparent text-white' : 'bg-white text-slate-800 hover:bg-slate-50'
      }`}
      style={
        active
          ? { background: STUDIO.gradient, borderRadius: STUDIO.btnRadius, boxShadow: STUDIO.shadow3dPrimary }
          : { borderColor: STUDIO.border, borderRadius: STUDIO.btnRadius, boxShadow: STUDIO.shadow3d }
      }
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] ${
          active ? 'bg-white/20 text-white' : 'bg-[#EEF2FF] text-[#6366F1]'
        }`}
      >
        <Icon size={15} />
      </span>
      <span>
        <span className={`block text-[13px] font-bold leading-tight ${active ? 'text-white' : 'text-[#1a1a1a]'}`}>{label}</span>
        {subtitle ? (
          <span className={`mt-0.5 block text-[10px] leading-tight ${active ? 'text-white/80' : 'text-[#9CA3AF]'}`}>{subtitle}</span>
        ) : null}
      </span>
    </button>
  );
}
