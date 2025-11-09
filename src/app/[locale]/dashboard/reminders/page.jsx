// handle the ui of after x time
/* 
	
	- i need in the card show he will work after how time not in 10:00pm will work say for example he will work after 00:32 minutes
	- and when you ask him about the permission of notfication make it alwyas not when open every time ask him about the notification permission 
	- and when add any reminder add it in the first and order the return reminders form the api by first work 
	- and enhance the card of showing the reminders more than this make it something awesome 
	
	- and also work the sound notification that he choose it when the alert get 
	- and put in the setting  the of creating reminder the sounds and when click on the button beside teh select can listen it becuase when i click on the button make close the modal 
	- and remove the search and also the button of ( الإشعارات مفعّلة) ask him if you need the permissison when open this page only dont' make controll on it for the client
	- and remove the select of ( غفوة ) form the card and teh check also 

	- and please enhance the card more than this of reminders 
	- and return teh full code after edit and use js not ts 
	*/


"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search as SearchIcon, Plus, Settings, Calendar as CalendarIcon, Bell,
  Clock, X, ChevronLeft, ChevronRight, CheckCircle2, Pencil, Power, PowerOff,
  Trash2, Info, BellRing, FileText, CalendarX, CalendarPlus, Zap
} from "lucide-react";

import { Modal, TabsPill } from "@/components/dashboard/ui/UI";
import Select from "@/components/atoms/Select";
import { TimeField } from "@/components/atoms/InputTime";
import InputDate from "@/components/atoms/InputDate";
import Input from "@/components/atoms/Input";
import Textarea from "@/components/atoms/Textarea";
import MultiLangText from "@/components/atoms/MultiLangText";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

import {
  WEEK_DAYS, PRAYERS, SOUND_SAMPLES, defaultSettings, defaultReminder,
  normalizeSchedule, computeNextOccurrence, fetchTodayPrayerTimes,
  listReminders, getUserSettingsApi, createReminderApi, updateReminderApi,
  deleteReminderApi, toggleActiveApi, snoozeReminderApi, markCompletedApi,
  updateUserSettingsApi, enableWebPush, sendReminderNow, safeT, toISODate, useReminderTicker,
	humanDateTime,
	sameDay
} from "@/components/pages/reminders/atoms";

 
function formatSchedule(t, rem) {
  const s = rem.schedule || {};
  const times = (s.times || []).map(formatTime12).join("، ");
  if (s.mode === "prayer" && s.prayer) {
    const dir = s.prayer.direction === "before"
      ? safeT(t, "before", "Before")
      : safeT(t, "after", "After");
    return `${s.prayer.name} • ${dir} ${s.prayer.offsetMin} ${safeT(t, "minutesShort", "min")}`;
  }
  const labelByMode = {
    once:    `${safeT(t, "mode.once", "Once")} (${times})`,
    daily:   `${safeT(t, "mode.daily", "Daily")} (${times})`,
    weekly:  `${safeT(t, "mode.weekly", "Weekly")} ${(s.daysOfWeek || []).join("، ") || "—"} (${times})`,
    monthly: `${safeT(t, "mode.monthly", "Monthly")} (${times})`,
    interval: s.interval
      ? `${safeT(t, "mode.intervalEvery", "Every")} ${s.interval.every} ${s.interval.unit} (${safeT(t, "form.from", "from")} ${formatTime12(s.times?.[0] || "—")})`
      : safeT(t, "mode.interval", "Interval"),
  };
  return labelByMode[s.mode] || labelByMode.daily;
}
function formatTime12(hhmm) {
  if (!hhmm) return "—";
  const [h0, m] = hhmm.split(":").map(Number);
  const h12 = ((h0 + 11) % 12) + 1;
  const ampm = h0 < 12 ? "AM" : "PM";
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ------------------ Page ------------------
export default function RemindersPage() {
  const t = useTranslations("reminders");
  const router = useRouter();

  const [reminders, setReminders] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pushAvailable, setPushAvailable] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(
    typeof Notification !== "undefined" ? Notification.permission === "granted" : false
  );

  // Pop-up when due
  const [dueModal, setDueModal] = useState({ open: false, reminder: null });

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [openSettings, setOpenSettings] = useState(false);
  const [openCalendar, setOpenCalendar] = useState(false);

  const [query, setQuery] = useState("");
  const today = new Date();
  const todayKey = ["SU","MO","TU","WE","TH","FR","SA"][today.getDay()];
  const [selectedDay, setSelectedDay] = useState(todayKey);
  const dayTabs = useMemo(
    () => WEEK_DAYS.map((d) => ({ key: d.key, label: safeT(t, `weekday.${d.label}`, d.label) })),
    [t]
  );

  const changeDay = useCallback((k) => setSelectedDay(k), []);

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [rs, st] = await Promise.all([listReminders(), getUserSettingsApi()]);
        if (!mounted) return;
        const withAudio = (rs || []).map((r) => ({
          ...r,
          sound: {
            ...r.sound,
            previewUrl:
              r.sound?.id === "drop" ? SOUND_SAMPLES.drop
              : r.sound?.id === "soft" ? SOUND_SAMPLES.soft
              : SOUND_SAMPLES.chime,
          },
        }));
        setReminders(withAudio);
        setSettings(st);

        if (typeof window !== "undefined" && "serviceWorker" in navigator) {
          const ok = await fetch("/sw.js").then((r) => r.ok).catch(() => false);
          setPushAvailable(ok);
        }

        if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
          try {
            const perm = await Notification.requestPermission();
            if (perm === "granted") {
              setPushEnabled(true);
              if (pushAvailable) {
                try { await enableWebPush(); } catch {}
              }
            }
          } catch {}
        } else if (typeof Notification !== "undefined") {
          setPushEnabled(Notification.permission === "granted");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [pushAvailable, t]);

  // Filter & sort
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = reminders
      .filter((r) => {
        if (!q) return true;
        const tt = (r.title || "").toLowerCase();
        const inText = tt.includes(q) || (r.notes || "").toLowerCase().includes(q);
        return inText;
      })
      .filter((r) => {
        const s = r.schedule || {};
        if (s.mode === "weekly" && Array.isArray(s.daysOfWeek) && s.daysOfWeek.length) {
          return s.daysOfWeek.includes(selectedDay);
        }
        return true;
      })
      .sort((a, b) =>
        (computeNextOccurrence(a, settings || {})?.getTime() || 0) -
        (computeNextOccurrence(b, settings || {})?.getTime() || 0)
      );
    return list;
  }, [reminders, query, selectedDay, settings]);

  // Ticker with popup-on-due
  useReminderTicker(
    reminders,
    setReminders,
    settings || { quietHours: { start: "22:00", end: "07:00" } },
    (rem) => setDueModal({ open: true, reminder: rem }) // open popup
  );

  // CRUD handlers (same behavior)
  const onCreate = () => { setEditing(null); setOpenForm(true); };
  const onEdit = (rem) => { setEditing(rem); setOpenForm(true); };

  const onSave = async (draft) => {
    const schedule = normalizeSchedule(draft.schedule);
    const payload = {
      ...draft,
      title: draft.title?.trim() || "Reminder",
      type: "custom",
      schedule: { ...schedule, exdates: (schedule.exdates || []).filter(Boolean) },
    };
    setOpenForm(false);

    if (draft.id) {
      const before = reminders;
      const idx = before.findIndex((r) => r.id === draft.id);
      const optimistic = [...before];
      optimistic[idx] = { ...before[idx], ...payload, updatedAt: new Date().toISOString() };
      setReminders(optimistic);
      try {
        const saved = await updateReminderApi(draft.id, payload);
        saved.sound.previewUrl =
          saved.sound?.id === "drop" ? SOUND_SAMPLES.drop :
          saved.sound?.id === "soft" ? SOUND_SAMPLES.soft :
          SOUND_SAMPLES.chime;
        setReminders((list) => list.map((r) => (r.id === saved.id ? saved : r)));
      } catch { setReminders(before); }
    } else {
      try {
        const created = await createReminderApi(payload);
        created.sound.previewUrl =
          created.sound?.id === "drop" ? SOUND_SAMPLES.drop :
          created.sound?.id === "soft" ? SOUND_SAMPLES.soft :
          SOUND_SAMPLES.chime;
        setReminders((list) => [created, ...list]);
      } catch {}
    }
  };

  const onDelete = async (id) => {
    const before = reminders;
    setReminders(before.filter((r) => r.id !== id));
    try { await deleteReminderApi(id); } catch { setReminders(before); }
  };

  const onToggleActive = async (id) => {
    const before = reminders;
    setReminders(before.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));
    try {
      const saved = await toggleActiveApi(id);
      saved.sound.previewUrl =
        saved.sound?.id === "drop" ? SOUND_SAMPLES.drop :
        saved.sound?.id === "soft" ? SOUND_SAMPLES.soft :
        SOUND_SAMPLES.chime;
      setReminders((list) => list.map((r) => (r.id === id ? saved : r)));
    } catch { setReminders(before); }
  };

  const onSnooze = async (rem, minutes) => {
    const m = minutes ?? settings?.defaultSnooze ?? 10;
    const until = new Date(Date.now() + m * 60 * 1000).toISOString();
    setReminders((list) => list.map((r) => (r.id === rem.id ? { ...r, _snoozedUntil: until } : r)));
    try {
      const saved = await snoozeReminderApi(rem.id, m);
      saved.sound.previewUrl =
        saved.sound?.id === "drop" ? SOUND_SAMPLES.drop :
        saved.sound?.id === "soft" ? SOUND_SAMPLES.soft :
        SOUND_SAMPLES.chime;
      setReminders((list) => list.map((r) => (r.id === rem.id ? { ...saved, _snoozedUntil: until } : r)));
    } catch {
      setReminders((list) => list.map((r) => (r.id === rem.id ? { ...r, _snoozedUntil: null } : r)));
    }
  };

  const onAck = async (rem) => {
    try {
      const saved = await markCompletedApi(rem.id);
      saved.sound.previewUrl =
        saved.sound?.id === "drop" ? SOUND_SAMPLES.drop :
        saved.sound?.id === "soft" ? SOUND_SAMPLES.soft :
        SOUND_SAMPLES.chime;
      setReminders((list) => list.map((r) => (r.id === rem.id ? saved : r)));
    } catch {}
  };

  // Quick create
  const quickCreate = async (mins) => {
    const n = Number(mins);
    if (Number.isNaN(n) || n <= 0) return;
    const now = new Date();
    const future = new Date(now.getTime() + n * 60 * 1000);
    const payload = defaultReminder({
      title: "Quick Alert",
      schedule: {
        mode: "once",
        times: [String(future).slice(16, 21) || "08:00"],
        startDate: toISODate(future),
        endDate: null,
        daysOfWeek: [],
        timezone: settings?.timezone || "Africa/Cairo",
      },
    });
    try {
      const created = await createReminderApi(payload);
      created.sound.previewUrl =
        created.sound?.id === "drop" ? SOUND_SAMPLES.drop :
        created.sound?.id === "soft" ? SOUND_SAMPLES.soft :
        SOUND_SAMPLES.chime;
      setReminders((list) => [created, ...list]);
    } catch {}
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-3 md:px-4 py-6">
        <div className="animate-pulse h-40 rounded-2xl bg-slate-100" />
        <div className="mt-4 grid gap-3">
          <div className="h-24 rounded-xl bg-slate-100" />
          <div className="h-24 rounded-xl bg-slate-100" />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-3 md:px-4 py-4 md:py-6">
      {/* Header */}
      <div className="relative z-[1] rounded-lg border border-indigo-100/60 bg-white/60 shadow-sm backdrop-blur">
        <div className="absolute rounded-lg inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 opacity-95" />
          <div className="absolute inset-0 opacity-15" style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.22) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            backgroundPosition: "-1px -1px",
          }} />
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-16 -right-8 h-60 w-60 rounded-full bg-blue-300/30 blur-3xl" />
        </div>

        <div className="relative p-3 md:p-5 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-4xl font-semibold">{safeT(t, "title", "Reminders")}</h1>
              <p className="text-white/85 mt-1 hidden md:block">
                {safeT(t, "subtitle", "Manage your personal reminders")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {pushAvailable && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      if (!pushEnabled) {
                        if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
                          const perm = await Notification.requestPermission();
                          if (perm !== "granted") return;
                        }
                        await enableWebPush().catch(() => {});
                        setPushEnabled(true);
                      }
                    } catch {}
                  }}
                  className={`rounded-lg border px-3 py-2 text-sm ${pushEnabled
                    ? "border-blue-100 bg-indigo-100/50 text-white/90 cursor-default"
                    : "border-white/30 bg-white/10 hover:bg-white/20"
                  }`}
                  disabled={pushEnabled}
                  aria-label={safeT(t, "actions.enablePush", "Enable notifications")}
                  title={safeT(t, "actions.enablePush", "Enable notifications")}
                >
                  <Bell className="inline-block w-4 h-4 mr-1 -mt-0.5" />
                  {pushEnabled ? safeT(t, "actions.pushEnabled", "Notifications Enabled") : safeT(t, "actions.enablePush", "Enable Push")}
                </button>
              )}

              <QuickCreate t={t} onPick={quickCreate} />

              <button type="button" onClick={() => sendReminderNow()}
                className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm hover:bg-white/20">
                <FileText className="inline-block w-4 h-4" />
              </button>

              <button type="button" onClick={() => setOpenCalendar(true)}
                className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm hover:bg-white/20">
                <CalendarIcon className="inline-block w-4 h-4" />
              </button>

              <button type="button" onClick={() => setOpenSettings(true)}
                className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm hover:bg-white/20">
                <Settings className="inline-block w-4 h-4" />
              </button>

              <button type="button" onClick={onCreate}
                className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm hover:bg-white/20">
                <Plus className="inline-block w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-2 md:mt-4 flex items-center justify-between gap-2">
            <TabsPill
              hiddenArrow sliceInPhone={false} isLoading={false}
              className="!rounded-lg flex-1 md:flex-none" slice={3}
              id="day-tabs" tabs={dayTabs} active={selectedDay} onChange={changeDay}
            />
            <div className="max-md:hidden relative w-full md:w-64">
              <SearchIcon className="absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/80" />
              <input
                value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder={safeT(t, "search.placeholder", "Search reminders…")}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-9 py-2 text-sm placeholder:text-white/70 outline-none focus:bg-white/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <section className="mt-6 grid grid-cols-1 gap-4">
        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 p-10 text-center">
            <p className="text-slate-600">{safeT(t, "empty.day", "No reminders for this day")}</p>
          </div>
        ) : (
          filtered.map((r) => (
            <ReminderCard
              key={r.id}
              t={t}
              reminder={r}
              settings={settings || { quietHours: { start: "22:00", end: "07:00" } }}
              onEdit={() => setEditing(r) || setOpenForm(true)}
              onDelete={() => onDelete(r.id)}
              onToggleActive={() => onToggleActive(r.id)}
              onSnooze={(m) => onSnooze(r, m)}
              onAck={() => onAck(r)}
            />
          ))
        )}
      </section>

      {/* Modals */}
      <Modal open={openForm} onClose={() => setOpenForm(false)}
        title={editing ? safeT(t, "form.editTitle", "Edit reminder") : safeT(t, "form.newTitle", "New reminder")}
        maxW="max-w-3xl">
        <ReminderForm
          t={t} initial={editing || defaultReminder()} onCancel={() => setOpenForm(false)}
          onSave={onSave} settings={settings || defaultSettings()}
        />
      </Modal>

      <Modal open={openSettings} onClose={() => setOpenSettings(false)}
        title={safeT(t, "settings.title", "Settings")} maxW="max-w-2xl">
        <SettingsPanel
          t={t} value={settings || defaultSettings()}
          onChange={async (val) => { try { const saved = await updateUserSettingsApi(val); setSettings(saved); } catch {} }}
        />
      </Modal>

      <Modal open={openCalendar} onClose={() => setOpenCalendar(false)}
        title={safeT(t, "calendar.title", "Calendar")} maxW="max-w-4xl">
        <CalendarView t={t} reminders={reminders} settings={settings || defaultSettings()} />
      </Modal>

      {/* Due popup (when website open) */}
      <DueDialog
        open={dueModal.open}
        reminder={dueModal.reminder}
        onClose={() => setDueModal({ open:false, reminder:null })}
        onSnooze={(m) => { if (dueModal.reminder) onSnooze(dueModal.reminder, m); setDueModal({ open:false, reminder:null }); }}
        onAck={() => { if (dueModal.reminder) onAck(dueModal.reminder); setDueModal({ open:false, reminder:null }); }}
      />
    </main>
  );
}

// -------------- Small UI pieces (same styling you had) --------------
function IconButton({ icon, onClick, label, danger }) {
  return (
    <button
      onClick={onClick} aria-label={label} title={label}
      className={`rounded-lg border px-2.5 py-2 text-sm transition ${danger
        ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
    >
      {icon}
    </button>
  );
}

function ReminderCard({ t, reminder, onEdit, onDelete, onToggleActive, onSnooze, onAck, settings }) {
  const next = computeNextOccurrence(reminder, settings || {});
  const due = next && next <= new Date();
  const muted = !reminder.active;

  return (
    <div className={`rounded-lg border border-slate-200 bg-white/70 p-4 md:p-5 shadow-sm backdrop-blur transition ${muted ? "opacity-60" : due ? "ring-2 ring-emerald-400" : ""}`}>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs mb-1 flex flex-wrap items-center gap-2 text-slate-600">
            <span className="inline-flex items-center gap-1 text-xs">
              <Clock className="w-4 h-4" /> <span>{formatSchedule(t, reminder)}</span>
            </span>
            {safeT(t, "next", "Next")}: {next ? humanDateTime(next) : "—"}
          </div>
          <MultiLangText className="truncate text-base font-semibold text-slate-800">{reminder.title}</MultiLangText>
          {reminder.notes && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{reminder.notes}</p>}
        </div>
        <div className="flex flex-wrap md:flex-nowrap items-center gap-1">
          <IconButton icon={<CheckCircle2 size={14} />} label={safeT(t,"actions.done","Done")} onClick={onAck} />
          <SnoozeSelect t={t} onPick={onSnooze} />
          <IconButton icon={<Pencil size={14} />} label={safeT(t,"actions.edit","Edit")} onClick={onEdit} />
          <IconButton icon={reminder.active ? <Power size={14}/> : <PowerOff size={14}/>}
            label={reminder.active ? safeT(t,"actions.disable","Disable") : safeT(t,"actions.enable","Enable")}
            onClick={onToggleActive} />
          <IconButton danger icon={<Trash2 size={14} />} label={safeT(t,"actions.delete","Delete")} onClick={onDelete} />
        </div>
      </div>
    </div>
  );
}

function SnoozeSelect({ t, onPick }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const options = [
    { id: "5", label: safeT(t, "snooze.5", "5 min") },
    { id: "10", label: safeT(t, "snooze.10", "10 min") },
    { id: "30", label: safeT(t, "snooze.30", "30 min") },
    { id: "60", label: safeT(t, "snooze.60", "60 min") },
    { id: "custom", label: safeT(t, "snooze.custom", "Custom…") },
  ];
  return (
    <div className="relative flex items-center gap-1">
      <Select
        options={options} value={null}
        onChange={(val) => {
          if (val === "custom") setOpen(true);
          else {
            const n = Number(val);
            if (!Number.isNaN(n)) onPick(n);
          }
        }}
        placeholder={safeT(t, "snooze.placeholder", "Snooze")}
        clearable={false} cnInputParent={"!h-[32px] !border-slate-200 "} className="min-w-[90px]"
      />
      <AnimatePresence>
        {open && (
          <motion.div className="absolute right-0 top-full z-50 mt-2 rounded-lg border border-slate-200 bg-white p-3 shadow-xl"
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
            <div className="text-sm text-slate-700 mb-2">{safeT(t,"snooze.customLabel","Minutes")}</div>
            <div className="flex items-center gap-2">
              <input type="number" min={1} className="h-[36px] w-[120px] rounded-lg border border-slate-300 px-2 text-sm"
                value={custom} onChange={(e) => setCustom(e.target.value)} />
              <button className="rounded-lg bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 text-white px-3 py-2 text-xs"
                onClick={() => { const n = Number(custom); if (!Number.isNaN(n) && n > 0) onPick(n); setOpen(false); setCustom(""); }}>
                {safeT(t, "actions.confirm", "Confirm")}
              </button>
              <button className="rounded-lg px-3 py-2 text-xs" onClick={() => setOpen(false)}>
                {safeT(t, "actions.cancel", "Cancel")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ----- Reminder Form (unchanged logic, JS only) -----
const schema = yup.object().shape({
  title: yup.string().trim().required(),
  type: yup.mixed().oneOf(["custom"]).default("custom"),
  schedule: yup.object({
    mode: yup.string().oneOf(["once","daily","weekly","monthly","interval","prayer"]).required(),
    startDate: yup.string().required(),
  }),
});

function ReminderForm({ t, initial, onCancel, onSave, settings }) {
  const { register, handleSubmit, control, watch, setValue, formState:{ errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      id: initial?.id || null,
      title: initial?.title || "Reminder",
      type: "custom",
      notes: initial?.notes || "",
      active: initial?.active ?? true,
      schedule: normalizeSchedule(initial?.schedule || {}),
      sound: initial?.sound || { id:"chime", name:"Chime", previewUrl:SOUND_SAMPLES.chime, volume:0.8 },
      priority: initial?.priority || "normal",
      rrule: initial?.schedule?.rrule || "",
      exdates: initial?.schedule?.exdates || [],
    },
  });

  const mode = watch("schedule.mode");
  const times = watch("schedule.times");
  const [showNotes, setShowNotes] = useState(Boolean(initial?.notes));
  const [showEndDate, setShowEndDate] = useState(Boolean(initial?.schedule?.endDate));
  const [activeTab, setActiveTab] = useState("details");

  const onSubmit = (data) => {
    onSave({
      ...data,
      type: "custom",
      title: data.title?.trim() || "Reminder",
      schedule: normalizeSchedule({ ...data.schedule, rrule: data.rrule, exdates: data.exdates }),
    });
  };
  const addTime = () => setValue("schedule.times", [...(times || []), "12:00"]);
  const removeTime = (idx) => setValue("schedule.times", (times || []).filter((_, i) => i !== idx));

  const [todayTimes, setTodayTimes] = useState(null);
  useEffect(() => {
    let mounted = true;
    fetchTodayPrayerTimes(settings).then((tms) => { if (mounted) setTodayTimes(tms); }).catch(()=>{});
    return () => { mounted = false; };
  }, [settings.city, settings.country]);

  const tabs = useMemo(() => [
    { key: "details",  label: safeT(t, "tabs.details", "Details") },
    { key: "settings", label: safeT(t, "tabs.settings", "Settings") },
  ], [t]);

  const MODE_OPTIONS = [
    { id:"once",    label: safeT(t,"mode.once","Once") },
    { id:"daily",   label: safeT(t,"mode.daily","Daily") },
    { id:"weekly",  label: safeT(t,"mode.weekly","Weekly") },
    { id:"monthly", label: safeT(t,"mode.monthly","Monthly") },
    { id:"interval",label: safeT(t,"mode.interval","Interval") },
    { id:"prayer",  label: safeT(t,"mode.prayer","Prayer") },
  ];

  return (
    <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)}>
      <TabsPill sliceInPhone={true} slice={false} hiddenArrow id="reminder-form-tabs"
        tabs={tabs} active={activeTab} onChange={setActiveTab} className="!rounded-lg" />

      {activeTab === "details" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label={safeT(t,"form.title","Title")}
                  placeholder={safeT(t,"form.titlePh","Reminder title")}
                  error={errors?.title && safeT(t,"errors.title","Title is required")}
                  {...register("title")}
                  onChange={(v) => setValue("title", v)}
                />
              </div>
              <button type="button" onClick={() => setShowNotes((v)=>!v)}
                className="flex items-center gap-2 h-[40px] rounded-lg bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 text-white px-3 text-sm">
                {showNotes ? <X className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              </button>
            </div>
            {showNotes && (
              <div className="mt-2">
                <Textarea
                  label={safeT(t,"form.note","Note")}
                  placeholder={safeT(t,"form.notePh","Optional note")}
                  {...register("notes")}
                  defaultValue=""
                />
              </div>
            )}
          </div>

          <input type="hidden" value="custom" {...register("type")} />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:col-span-2">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  {safeT(t,"form.startDate","Start date")}
                </label>
                <InputDate value={watch("schedule.startDate") || toISODate(new Date())}
                  onChange={(v) => setValue("schedule.startDate", v)} />
              </div>
              <button type="button" onClick={() => setShowEndDate((v)=>!v)}
                className="flex items-center justify-center h-[40px] w-[40px] rounded-lg bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 text-white"
                title={showEndDate ? safeT(t,"form.endHide","Remove end date") : safeT(t,"form.endAdd","Add end date")}>
                {showEndDate ? <CalendarX className="w-4 h-4" /> : <CalendarPlus className="w-4 h-4" />}
              </button>
            </div>
            {showEndDate && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  {safeT(t,"form.endDate","End date")}
                </label>
                <InputDate value={watch("schedule.endDate") || ""} onChange={(v) => setValue("schedule.endDate", v || null)} />
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <div className="mb-1.5 flex items-center gap-1.5">
              <label className="block text-sm font-medium text-slate-700">{safeT(t,"form.mode","Mode")}</label>
              <Info className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <Controller control={control} name="schedule.mode" render={({ field }) => (
              <Select options={MODE_OPTIONS} value={field.value || "daily"}
                onChange={(val) => field.onChange(val)} placeholder={safeT(t,"form.modePh","Select mode")}
                className="min-w-[220px]" />
            )}/>
            {errors?.schedule?.mode && (
              <p className="mt-1.5 text-xs text-rose-600">{safeT(t,"errors.mode","Select a mode")}</p>
            )}
          </div>

          {mode === "weekly" && (
            <WeeklyDaysSelector
              t={t} initial={initial}
              getDays={() => watch("schedule.daysOfWeek")}
              setDays={(arr) => setValue("schedule.daysOfWeek", arr)}
            />
          )}

          {mode === "interval" && (
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  {safeT(t,"form.intervalStart","Start time")}
                </label>
                <TimeField showLabel={false} value={(times && times[0]) || "09:00"}
                  onChange={(val) => setValue("schedule.times", [val])} />
              </div>
              <Controller control={control} name="schedule.interval.every" render={({ field }) => (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {safeT(t,"form.intervalEvery","Repeat every")}
                  </label>
                  <Select
                    options={[{id:"2",label:"every.2h"},{id:"3",label:"every.3h"},{id:"4",label:"every.4h"},{id:"5",label:"every.5h"},{id:"6",label:"every.6h"}]}
                    value={String(field.value || 2)}
                    onChange={(val) => field.onChange(Number(val))}
                  />
                </div>
              )}/>
            </div>
          )}

          {mode !== "prayer" && mode !== "interval" && (
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {safeT(t,"form.times","Times")}
              </label>
              <div className="flex flex-wrap gap-2">
                {(times || []).map((tVal, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2">
                    <TimeField showLabel={false} value={tVal}
                      onChange={(val) => {
                        const next = (times || []).map((x, idx) => (idx === i ? val : x));
                        setValue("schedule.times", next);
                      }} />
                    <IconButton danger icon={<X className="w-4 h-5" />} onClick={() => removeTime(i)} />
                  </div>
                ))}
                <button type="button" onClick={addTime}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">
                  {safeT(t,"form.addTime","Add time")}
                </button>
              </div>
            </div>
          )}

          {mode === "prayer" && (
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3">
              <Controller control={control} name="schedule.prayer.name" render={({ field }) => (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {safeT(t,"form.prayer","Prayer")}
                  </label>
                  <Select options={PRAYERS.map((p)=>({ id:p, label:p }))} value={field.value || "Fajr"}
                    onChange={(val) => field.onChange(val)} />
                </div>
              )}/>
              <Controller control={control} name="schedule.prayer.direction" render={({ field }) => (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {safeT(t,"form.beforeAfter","Before/After")}
                  </label>
                  <Select options={[{id:"before",label:safeT(t,"before","Before")},{id:"after",label:safeT(t,"after","After")}]}
                    value={field.value || "before"} onChange={(val) => field.onChange(val)} />
                </div>
              )}/>
              <Controller control={control} name="schedule.prayer.offsetMin" render={({ field }) => (
                <Input label={safeT(t,"form.minutes","Minutes")} type="number"
                  value={field.value ?? 10} onChange={(v) => field.onChange(Number(v) || 0)} cnInputParent="h-[40px]" />
              )}/>
            </div>
          )}
        </div>
      )}

      {activeTab === "settings" && (
        <div className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {safeT(t,"settings.defaultSnooze","Default snooze (min)")}
              </label>
              <Input type="number" cnInputParent="h-[40px]" value={watch("defaultSnooze") ?? 10}
                onChange={(x) => setValue("defaultSnooze", Number(x) || 10)} />
            </div>
            <div className="flex w-full">
              <span className="w-full">
                <Controller control={control} name="sound.id" render={({ field }) => (
                  <Select
                    options={[{id:"chime",label:"Chime"},{id:"drop",label:"Water Drop"},{id:"soft",label:"Soft Bell"}]}
                    label={safeT(t,"settings.sound","Sound")}
                    value={field.value || "chime"}
                    onChange={(val) => {
                      const map = {
                        chime: { id:"chime", name:"Chime", previewUrl:SOUND_SAMPLES.chime },
                        drop:  { id:"drop",  name:"Water Drop", previewUrl:SOUND_SAMPLES.drop },
                        soft:  { id:"soft",  name:"Soft Bell", previewUrl:SOUND_SAMPLES.soft },
                      };
                      const vol = watch("sound.volume") ?? 0.8;
                      setValue("sound", { ...(map[val] || map.chime), volume: vol });
                    }}
                  />
                )}/>
              </span>
              <span className="mx-1 mt-[27px]">
                <IconButton
                  icon={<BellRing className="w-5 h-5" />}
                  label={safeT(t,"settings.preview","Preview")}
                  onClick={() => {
                    const audio = new Audio((watch("sound") || {}).previewUrl || SOUND_SAMPLES.chime);
                    audio.volume = Number.isFinite(watch("sound.volume")) ? watch("sound.volume") : 0.8;
                    audio.play().catch(()=>{});
                  }}
                />
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm text-slate-600">{safeT(t,"settings.quietFrom","Quiet from")}</label>
              <Input placeholder="10:00 PM" value={watch("quietHours.start") ?? "10:00 PM"}
                onChange={(x)=> setValue("quietHours",{ ...(watch("quietHours")||{}), start:x })} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">{safeT(t,"settings.quietTo","Quiet to")}</label>
              <Input placeholder="07:00 AM" value={watch("quietHours.end") ?? "07:00 AM"}
                onChange={(x)=> setValue("quietHours",{ ...(watch("quietHours")||{}), end:x })} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">{safeT(t,"settings.timezone","Timezone")}</label>
              <Input value={watch("timezone") ?? "Africa/Cairo"} onChange={(x)=> setValue("timezone", x)} />
            </div>
          </div>

          <div className="mt-2 flex items-center justify-end gap-2">
            <button type="button" onClick={onCancel}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50">
              {safeT(t,"actions.cancel","Cancel")}
            </button>
            <button type="submit"
              className="rounded-lg bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 text-white px-4 py-2">
              {safeT(t,"actions.save","Save")}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

function WeeklyDaysSelector({ t, initial, getDays, setDays }) {
  const days = getDays() || initial?.schedule?.daysOfWeek || [];
  const orderedDays = WEEK_DAYS;
  const isSelected = (k) => (days || []).includes(k);
  const setSorted = (arr) => setDays(Array.from(new Set(arr)));
  const toggle = (k) => { const cur = new Set(days || []); cur.has(k) ? cur.delete(k) : cur.add(k); setSorted([...cur]); };

  const setAll = () => setSorted(WEEK_DAYS.map((d) => d.key));
  const setNone = () => setDays([]);

  return (
    <div className="md:col-span-2">
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{safeT(t,"form.weekdays","Week days")}</label>
      <div className="mb-2 flex items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={setAll}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 text-slate-700 px-3 h-8 text-sm hover:bg-slate-200">
            {safeT(t, "week.quick.all", "All")}
          </button>
          <button type="button" onClick={setNone}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 text-slate-700 px-3 h-8 text-sm hover:bg-slate-200">
            {safeT(t, "week.quick.none", "None")}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {orderedDays.map((d) => {
          const selected = isSelected(d.key);
          return (
            <button key={d.key} type="button" role="checkbox" aria-checked={selected}
              title={safeT(t, `weekday.${d.label}`, d.label)} onClick={() => toggle(d.key)}
              className={[
                "h-9 min-w-9 px-3 rounded-lg text-sm font-medium transition-all select-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50",
                selected
                  ? "bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
              ].join(" ")}
            >
              {safeT(t, `weekday.${d.label}`, d.label)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ------- Settings panel (simple) -------
function SettingsPanel({ t, value, onChange }) {
  const [v, setV] = useState(value);
  const set = (patch) => setV((s) => ({ ...s, ...patch }));
  const save = async () => {
    try { const saved = await updateUserSettingsApi(v); onChange(saved); } catch {}
  };
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Input label={safeT(t,"settings.timezone","Timezone")} cnInputParent="h-[40px]" value={v.timezone} onChange={(x)=>set({timezone:x})}/>
        <Input label={safeT(t,"settings.city","City")} cnInputParent="h-[40px]" value={v.city} onChange={(x)=>set({city:x})}/>
        <Input label={safeT(t,"settings.country","Country")} cnInputParent="h-[40px]" value={v.country} onChange={(x)=>set({country:x})}/>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm text-slate-600">{safeT(t,"settings.quietFrom","Quiet from")}</label>
          <Input value={v.quietHours.start} onChange={(x)=>set({quietHours:{...v.quietHours, start:x}})} placeholder="10:00 PM" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">{safeT(t,"settings.quietTo","Quiet to")}</label>
          <Input value={v.quietHours.end} onChange={(x)=>set({quietHours:{...v.quietHours, end:x}})} placeholder="07:00 AM" />
        </div>
        <Input label={safeT(t,"settings.defaultSnooze","Default snooze (min)")} type="number" cnInputParent="h-[40px]"
          value={v.defaultSnooze} onChange={(x)=>set({defaultSnooze:Number(x)||10})}/>
      </div>
      <div className="flex justify-end">
        <button onClick={save} className="rounded-lg bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 text-white px-4 py-2">
          {safeT(t,"actions.save","Save")}
        </button>
      </div>
    </div>
  );
}

// ------- Calendar (same concept) -------
function CalendarView({ t, reminders, settings }) {
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const y = cursor.getFullYear(); const m = cursor.getMonth();
  const first = new Date(y, m, 1);
  const startWeekday = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daySlots = [];
  for (let i = 0; i < startWeekday; i++) daySlots.push(null);
  for (let d = 1; d <= daysInMonth; d++) daySlots.push(new Date(y, m, d));

  const byDay = new Map();
  reminders.forEach((r) => {
    const s = r.schedule || {};
    if (s.mode === "once") {
      const dt = new Date(`${s.startDate}T00:00:00`);
      const key = toISODate(dt);
      byDay.set(key, [...(byDay.get(key) || []), r]);
      return;
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(y, m, d);
      const key = toISODate(day);
      if (s.mode === "weekly") {
        const code = ["SU","MO","TU","WE","TH","FR","SA"][day.getDay()];
        if ((s.daysOfWeek || []).includes(code)) byDay.set(key, [...(byDay.get(key) || []), r]);
      } else {
        byDay.set(key, [...(byDay.get(key) || []), r]);
      }
    }
  });

  const selectedKey = selectedDate ? toISODate(selectedDate) : null;
  const selectedList = selectedKey ? byDay.get(selectedKey) || [] : [];

  return (
    <div className="grid gap-4 md:grid-cols-5">
      <div className="md:col-span-3">
        <div className="mb-3 flex items-center justify-between">
          <button className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
            onClick={() => setCursor(new Date(y, m - 1, 1))}><ChevronRight className="w-4 h-4" /></button>
          <div className="text-slate-800 font-medium">{cursor.toLocaleDateString("ar-EG", { month:"long", year:"numeric" })}</div>
          <button className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
            onClick={() => setCursor(new Date(y, m + 1, 1))}><ChevronLeft className="w-4 h-4" /></button>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-[13px] text-slate-500">
          {["mon","tue","wed","thu","fri","sat","sun"].map((d) => (<div key={d} className="py-1">{safeT(t, `weekday.header.${d}`, d)}</div>))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-2">
          {daySlots.map((d, i) => {
            if (!d) return <div key={i} className="rounded-lg border border-transparent p-3" />;
            const key = toISODate(d);
            const list = byDay.get(key) || [];
            const count = list.length;
            const isToday = sameDay(d, new Date());
            const isSelected = selectedDate && sameDay(d, selectedDate);
            return (
              <button key={i} onClick={() => setSelectedDate(d)}
                className={`text-left rounded-lg border p-3 min-h-[70px] text-sm transition ${isSelected
                  ? "border-blue-600 bg-blue-50/60" : isToday
                  ? "border-emerald-400 bg-emerald-50/40" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">{d.getDate()}</span>
                  {count > 0 && <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-white">{count}</span>}
                </div>
                <div className="mt-2 flex gap-1 flex-wrap">
                  {Array.from({ length: Math.min(count, 5) }).map((_, idx) => (
                    <span key={idx} className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="md:col-span-2">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="mb-2 text-slate-700 font-medium">
            {selectedDate
              ? safeT(t,"calendar.remindersOf","Reminders of")+" "+selectedDate.toLocaleDateString("ar-EG",{weekday:"long",day:"numeric",month:"long"})
              : safeT(t,"calendar.pickDay","Pick a day")}
          </div>
          <div className="space-y-2">
            {selectedList.length === 0 ? (
              <p className="text-sm text-slate-500">{safeT(t,"calendar.none","No reminders")}</p>
            ) : selectedList.map((r, idx) => (
              <div key={idx} className="rounded-lg border border-slate-200 p-2">
                <div className="text-sm font-medium text-slate-800">{r.title || safeT(t,"untitled","Untitled")}</div>
                <div className="text-xs text-slate-600">{formatSchedule(t, r)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ------- Quick Create -------
function QuickCreate({ t, onPick }) {
  const [open, setOpen] = useState(false);
  const options = [{id:"5",label:"5"},{id:"10",label:"10"},{id:"15",label:"15"},{id:"30",label:"30"},{id:"50",label:"50"},{id:"custom",label:safeT(t,"quick.custom","Custom…")}];
  const [custom, setCustom] = useState("");
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v)=>!v)}
        className="flex gap-1 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
        aria-label={safeT(t,"quick.title","Quick reminder")} title={safeT(t,"quick.title","Quick reminder")}>
        <Zap className="inline-block w-4 h-4 mt-[2px]" />
        {safeT(t,"quick.after","After X min")}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-xl z-50"
            initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-4 }}>
            <div className="grid gap-1 max-h-[105px] overflow-y-auto">
              {options.slice(0,4).map((o) => (
                <button key={o.id} className="rtl:text-right text-left rounded-md text-slate-800 px-3 py-2 text-sm hover:bg-slate-50"
                  onClick={() => { onPick(Number(o.id)); setOpen(false); }}>
                  {safeT(t,"quick.createIn","Create in")} {o.id} {safeT(t,"minutesShort","min")}
                </button>
              ))}
              <div className="border-t border-slate-100 my-1" />
              <div className="flex items-center gap-2 px-2">
                <input type="number" min={1} placeholder={safeT(t,"quick.custom","Custom…")}
                  className="text-slate-800 h-[36px] w-full rounded-lg border border-slate-300 px-2 text-sm"
                  value={custom} onChange={(e)=>setCustom(e.target.value)} />
                <button className="rounded-lg bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 text-white px-3 py-2 text-xs"
                  onClick={() => { const n = Number(custom); if (!Number.isNaN(n) && n > 0) onPick(n); setCustom(""); setOpen(false); }}>
                  {safeT(t,"actions.add","Add")}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --------- Due Dialog (popup when website open) ----------
function DueDialog({ open, reminder, onClose, onSnooze, onAck }) {
  if (!open || !reminder) return null;
  return (
    <Modal open={open} onClose={onClose} title={reminder.title || "Reminder"} maxW="max-w-md">
      <div className="grid gap-3">
        {reminder.notes && <p className="text-slate-700">{reminder.notes}</p>}
        <div className="flex items-center justify-end gap-2">
          <button onClick={() => onSnooze(10)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50">
            Snooze 10m
          </button>
          <button onClick={() => onSnooze(30)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50">
            Snooze 30m
          </button>
          <button onClick={onAck} className="rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 text-white px-4 py-2">
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
