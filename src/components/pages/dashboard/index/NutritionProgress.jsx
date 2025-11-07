// app/(admin)/statistics/NutritionProgressTab.jsx
"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  UtensilsCrossed, CalendarDays, CheckCircle2, Pill, TrendingUp, BarChart3, StickyNote
} from "lucide-react";

const cn = (...c) => c.filter(Boolean).join(" ");
const spring = { type: "spring", stiffness: 120, damping: 16, mass: 0.8 };

// ---------- small utils ----------
const toDayKey = (d) => new Date(d).toISOString().slice(0, 10);
const safeNum = (n, f = 0) => (n == null || isNaN(n) ? 0 : +Number(n).toFixed(f));
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return "—";
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function groupByDay(logs = []) {
  const map = {};
  for (const m of logs) {
    const key = toDayKey(m.eatenAt ?? m.created_at ?? m.updated_at);
    if (!map[key]) map[key] = [];
    map[key].push(m);
  }
  // newest day first
  return Object.entries(map)
    .sort(([a], [b]) => new Date(b) - new Date(a))
    .map(([day, list]) => ({ day, list: list.sort((a, b) => a.mealIndex - b.mealIndex) }));
}
function topFoods(logs = [], limit = 8) {
  const counts = new Map();
  for (const m of logs) {
    (m.items || []).forEach((it) => {
      const k = (it.name || "").trim();
      if (!k) return;
      counts.set(k, (counts.get(k) || 0) + 1);
    });
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, c]) => ({ name, count: c }));
}
function buildAdherenceSeries(logs = [], days = 14) {
  // Last N calendar days ending today
  const today = new Date();
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayMeals = logs.filter((m) => toDayKey(m.eatenAt || m.created_at) === key);
    const val = dayMeals.length ? avg(dayMeals.map((m) => safeNum(m.adherence))) : 0;
    series.push({ x: key, y: +val.toFixed(2), count: dayMeals.length });
  }
  return series;
}
function sparkPath(points, { w = 240, h = 56, pad = 6 } = {}) {
  if (!points.length) return "";
  const xs = points.map((p) => new Date(p.x).getTime());
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rw = w - pad * 2, rh = h - pad * 2;
  const sx = (t) => (maxX === minX ? pad + rw / 2 : pad + ((t - minX) / (maxX - minX)) * rw);
  const sy = (v) => (maxY === minY ? pad + rh / 2 : pad + rh - ((v - minY) / (maxY - minY)) * rh);
  return points.map((p, i) => `${i ? "L" : "M"} ${sx(new Date(p.x).getTime()).toFixed(2)} ${sy(p.y).toFixed(2)}`).join(" ");
}
const maxBy = (arr, key) => (arr.length ? Math.max(...arr.map((a) => Number(a[key] || 0))) : 0);

// ---------- primitives ----------
function Card({ className, children }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className={cn("rounded-lg border border-slate-200 bg-white shadow-sm", className)}
    >
      {children}
    </motion.section>
  );
}
function CardHeader({ icon, title, subtitle, actions }) {
  const Icon = icon;
  return (
    <div className="flex items-start justify-between p-4 pb-2">
      <div>
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="h-4 w-4 text-slate-500" /> : null}
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        </div>
        {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
function KPI({ icon: Icon, label, value, hint, tone = "emerald" }) {
  const toneMap = {
    emerald: "bg-emerald-50 ring-emerald-100 text-emerald-600",
    indigo: "bg-indigo-50 ring-indigo-100 text-indigo-600",
    amber: "bg-amber-50 ring-amber-100 text-amber-600",
    sky: "bg-sky-50 ring-sky-100 text-sky-600",
    rose: "bg-rose-50 ring-rose-100 text-rose-600",
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4">
      <div className="flex items-center gap-2">
        <span className={cn("h-6 w-6 grid place-items-center rounded-lg ring-1", toneMap[tone])}>
          {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        </span>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
      <div className="mt-1 text-xl font-semibold text-slate-900">{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}
function FoodPill({ name, count }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
      <UtensilsCrossed className="h-3.5 w-3.5 text-slate-500" />
      <span className="truncate max-w-[14ch]">{name}</span>
      <span className="ml-1 rounded-md bg-white border border-slate-200 px-1.5 py-0.5 text-[11px]">{count}</span>
    </span>
  );
}

// ---------- main ----------
export default function NutritionProgressTab({ data }) {
  const t = useTranslations("nutritionProgress");
  const logs = Array.isArray(data) ? data : [];

  // Derive stats
  const days = useMemo(() => groupByDay(logs), [logs]);
  const mealsLogged = logs.length;
  const supplementsCount = useMemo(
    () => logs.reduce((n, m) => n + (m.supplementsTaken?.filter((s) => s.taken)?.length || 0), 0),
    [logs]
  );
  const adherenceAvg = useMemo(() => safeNum(avg(logs.map((m) => safeNum(m.adherence))), 2), [logs]);

  const top = useMemo(() => topFoods(logs, 10), [logs]);

  // Charts
  const adherenceSeries = useMemo(() => buildAdherenceSeries(logs, 14), [logs]);
  const adherencePath = sparkPath(adherenceSeries);
  const mealsSeries = useMemo(
    () => adherenceSeries.map((d) => ({ x: d.x, y: d.count })), // counts per day
    [adherenceSeries]
  );
  const mealsMax = useMemo(() => maxBy(mealsSeries, "y"), [mealsSeries]);

  return (
    <div className="space-y-6">

      {/* KPIs */}
      <div className="">
        <Card>
          <CardHeader icon={BarChart3} title={t("kpi.title")} subtitle={t("kpi.subtitle")} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 pt-2">
            <KPI
              icon={CheckCircle2}
              label={t("kpi.mealsLogged")}
              value={mealsLogged}
              hint={t("kpi.daysCovered", { n: days.length })}
              tone="indigo"
            />
            <KPI
              icon={TrendingUp}
              label={t("kpi.adherenceAvg")}
              value={`${adherenceAvg}%`}
              hint={t("kpi.scale5")}
              tone="emerald"
            />
            <KPI
              icon={Pill}
              label={t("kpi.supplements")}
              value={supplementsCount}
              hint={t("kpi.taken")}
              tone="amber"
            />
            <KPI
              icon={CalendarDays}
              label={t("kpi.lastLog")}
              value={logs.length ? formatDate(logs[0].eatenAt || logs[0].created_at) : "—"}
              hint={t("kpi.latestHint")}
              tone="sky"
            />
          </div>
        </Card>
      </div>

      {/* Adherence sparkline + Meals density bars */}
      <div className=" grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader icon={TrendingUp} title={t("adherence.title")} subtitle={t("adherence.subtitle")} />
          <div className="p-4 pt-2">
            <div className="rounded-lg border border-slate-200 p-4 bg-white">
              <svg viewBox="0 0 240 64" className="w-full h-16">
                <path d={adherencePath} fill="none" stroke="currentColor" className="text-emerald-500" strokeWidth="2" />
              </svg>
              <div className="mt-2 text-xs text-slate-500">{t("adherence.caption")}</div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader icon={BarChart3} title={t("mealsDensity.title")} subtitle={t("mealsDensity.subtitle")} />
          <div className="p-4 pt-2">
            {mealsSeries.length ? (
              <div className="grid grid-cols-14 gap-2">
                {mealsSeries.map((d) => {
                  const pct = mealsMax ? Math.round((d.y / mealsMax) * 100) : 0;
                  return (
                    <div key={d.x} className="flex flex-col items-center gap-1">
                      <div className="h-24 w-3 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="w-3 rounded-full bg-gradient-to-t from-indigo-500 to-cyan-400"
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500">{d.x.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">{t("empty")}</p>
            )}
          </div>
        </Card>
      </div>

      {/* Top foods */}
      <div className="">
        <Card>
          <CardHeader icon={UtensilsCrossed} title={t("topFoods.title")} subtitle={t("topFoods.subtitle")} />
          <div className="p-4 pt-2">
            {top.length ? (
              <div className="flex flex-wrap gap-2">
                {top.map((f, i) => (
                  <FoodPill key={`${f.name}-${i}`} name={f.name} count={f.count} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">{t("empty")}</p>
            )}
          </div>
        </Card>
      </div>

      {/* Logs by day */}
      <div className="">
        <Card>
          <CardHeader icon={StickyNote} title={t("logs.title")} subtitle={t("logs.subtitle")} />
          <div className="p-4 pt-2 space-y-6">
            {days.length ? (
              days.map(({ day, list }) => (
                <section key={day}>
                  <div className="font-en  mb-2 text-xs font-medium text-slate-500">{formatDate(day)}</div>
                  <ul className=" overflow-x-auto pb-[10px] flex items-center  gap-3">
                    {list.map((m) => {
                      const items = m.items || [];
                      const supps = m.supplementsTaken?.filter((s) => s.taken) || [];
                      return (
                        <li key={m.id} className="min-h-[200px] max-w-[250px] w-full flex-none h-full rounded-lg border border-slate-200 bg-white/70 p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className=" font-en text-sm font-medium text-slate-900">
                                {m.mealTitle}
                              </div>
                              <div className="mt-0.5 text-xs text-slate-500">
                                {t("logs.at")} <span className="font-en" >{formatDate(m.eatenAt || m.created_at)}</span>
                              </div>
                            </div>
                            <span className="rounded-md bg-emerald-50 ring-1 ring-emerald-100 text-emerald-700 text-xs px-2 py-1">
                              {t("logs.adherence", { n: m.adherence ?? 0 })}
                            </span>
                          </div>

                          {/* items */}
                          {items.length ? (
                            <div className="mt-2">
                              <div className="text-[11px] text-slate-500">{t("logs.items")}</div>
                              <ul className="mt-1 space-y-1">
                                {items.slice(0, 2).map((it) => (
                                  <li key={it.id} className="flex items-center justify-between text-xs">
                                    <span className="truncate text-slate-700">{it.name}</span>
                                    <span className=" font-en rtl:mr-2 ltr:ml-2 shrink-0 text-slate-500 tabular-nums">
                                      {it.quantity}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                              {items.length > 2 ? (
                                <div className="mt-1 text-[11px] text-slate-400">
                                  +{items.length - 2} {t("logs.more")}
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          {/* supplements */}
                          {supps.length ? (
                            <div className="mt-2">
                              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                <Pill className="h-3.5 w-3.5" />
                                {t("logs.supplements")}
                              </div>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                {supps.map((s) => (
                                  <span
                                    key={s.id}
                                    className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700"
                                  >
                                    {s.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {/* notes */}
                          {m.notes ? (
                            <div className="mt-2 text-xs text-slate-600">{m.notes}</div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            ) : (
              <p className="text-sm text-slate-500">{t("empty")}</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
