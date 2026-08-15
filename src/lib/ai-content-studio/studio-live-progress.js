const STEP_DEFS = [
  { id: 'start', label: 'Start', labelAr: 'البداية' },
  { id: 'topic', label: 'Topic', labelAr: 'الموضوع' },
  { id: 'research', label: 'Research', labelAr: 'البحث' },
  { id: 'content', label: 'Content', labelAr: 'المحتوى' },
  { id: 'image', label: 'Image', labelAr: 'الصورة' },
  { id: 'validate', label: 'Quality', labelAr: 'المراجعة' },
];

function lastLog(logs, module) {
  const list = Array.isArray(logs) ? logs : [];
  return [...list].reverse().find((l) => l?.module === module) || null;
}

function stepStatus({ done, active, error, skipped }) {
  if (error) return 'error';
  if (skipped) return 'skipped';
  if (done) return 'done';
  if (active) return 'active';
  return 'pending';
}

/**
 * Merge server progressJson with actual execution fields/logs
 * so the dock always reflects what is running now.
 */
export function deriveLiveProgress(execution, running = false) {
  const live = running || execution?.status === 'RUNNING';
  const server = execution?.progress && typeof execution.progress === 'object' ? execution.progress : {};
  const logs = execution?.logs || [];
  const errors = execution?.errors || [];
  const research = execution?.research;
  const err = (mod) => errors.some((e) => e?.module === mod);
  const researchSkipped = research?.enabled === false || research?.message === 'Research/scraping is OFF';
  const finished = execution?.status === 'COMPLETED';

  const done = {
    start: live || Boolean(execution?.status),
    topic: Boolean(execution?.topic),
    research: Boolean(research?.ran) || Boolean(research?.hits?.length) || researchSkipped,
    content: Boolean(execution?.content),
    image: Boolean(execution?.imageUrl),
    validate: Boolean(execution?.progress?.validation) || Boolean(execution?.content && execution?.imageUrl) || finished,
  };

  let activeId = null;
  if (live) {
    if (!done.topic) activeId = 'topic';
    else if (!done.research && !researchSkipped) activeId = 'research';
    else if (!done.content) activeId = 'content';
    else if (!done.image) activeId = 'image';
    else if (!done.validate) activeId = 'validate';
  }

  const researchLog = lastLog(logs, 'research');
  const details = {
    start: live ? { en: 'Pipeline running', ar: 'التشغيل شغال' } : null,
    topic: execution?.topic ? { en: String(execution.topic).slice(0, 90), ar: String(execution.topic).slice(0, 90) } : null,
    research: {
      en: researchLog?.message || research?.message || (activeId === 'research' ? 'Searching the web…' : ''),
      ar: researchLog?.messageAr || (activeId === 'research' ? 'بيدور على الويب…' : ''),
    },
    content: execution?.content ? { en: 'Post written', ar: 'المنشور اتكتب' } : { en: activeId === 'content' ? 'Writing the post…' : '', ar: activeId === 'content' ? 'بيكتب المنشور…' : '' },
    image: execution?.imageUrl ? { en: 'Image generated', ar: 'الصورة اتولدت' } : { en: activeId === 'image' ? 'Generating image…' : '', ar: activeId === 'image' ? 'بيولّد الصورة…' : '' },
    validate: done.validate
      ? { en: execution?.progress?.validation?.message || 'Quality checked', ar: 'المراجعة خلصت' }
      : { en: activeId === 'validate' ? 'Validating…' : '', ar: activeId === 'validate' ? 'بيراجع الجودة…' : '' },
  };

  const serverById = Object.fromEntries((server.steps || []).map((s) => [s.id, s]));

  const steps = STEP_DEFS.map((def) => {
    const fromServer = serverById[def.id] || {};
    const skipped = def.id === 'research' && researchSkipped && !done.research;
    const status = stepStatus({
      done: done[def.id],
      active: activeId === def.id,
      error: err(def.id) || fromServer.status === 'error',
      skipped: skipped || fromServer.status === 'skipped',
    });
    const d = details[def.id];
    return {
      id: def.id,
      label: def.label,
      labelAr: def.labelAr,
      status: fromServer.status === 'active' && live ? 'active' : status,
      detail: fromServer.detail || d?.en || '',
      detailAr: fromServer.detailAr || d?.ar || '',
    };
  });

  const doneCount = steps.filter((s) => s.status === 'done' || s.status === 'skipped').length;
  const derivedPercent = Math.round((doneCount / steps.length) * 100);
  const percent =
    typeof server.percent === 'number' && live
      ? Math.max(server.percent, Math.min(96, derivedPercent))
      : execution?.status === 'COMPLETED'
        ? 100
        : execution?.status === 'FAILED'
          ? Math.max(derivedPercent, server.percent || 0)
          : live
            ? Math.max(4, derivedPercent)
            : server.percent || 0;

  const active = steps.find((s) => s.status === 'active');
  const message = server.message || active?.detail || (live ? 'Working…' : '');
  const messageAr = server.messageAr || active?.detailAr || (live ? 'بيشتغل…' : '');

  return {
    phase: server.phase || active?.id || execution?.status || 'idle',
    percent,
    message,
    messageAr,
    steps,
    updatedAt: server.updatedAt || execution?.updatedAt,
  };
}
