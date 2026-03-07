"use client";
import { useState, useMemo } from "react";
import { initialMeals, categories } from "../../recipes/data";
 
import { Input }  from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge }     from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog";
import {
  Search, SlidersHorizontal, Clock, Users,
  BarChart2, ChefHat, Lightbulb, X,
} from "lucide-react";
import { useTranslations } from "next-intl";

/* ─── constants ──────────────────────────────────────────── */
const CAT_META = {
  Breakfast: { color: "#E8956D", bg: "#FEF3EC", icon: "🌅" },
  Lunch:     { color: "#5B8A5F", bg: "#EEF6EF", icon: "☀️"  },
  Dinner:    { color: "#6B5EA8", bg: "#F0EEF9", icon: "🌙"  },
  Snack:     { color: "#C4943A", bg: "#FBF3E3", icon: "🍎"  },
  Drink:     { color: "#4A90B8", bg: "#EBF4FA", icon: "🥤"  },
  Dessert:   { color: "#C4627A", bg: "#FCEEF1", icon: "🍮"  },
};
const catColor = (c) => CAT_META[c]?.color || "#888";
const catBg    = (c) => CAT_META[c]?.bg    || "#f5f5f5";
const catIcon  = (c) => CAT_META[c]?.icon  || "🍽️";

/* ─── tiny MacroBar ──────────────────────────────────────── */
function MacroBar({ val, max, color }) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden"
      style={{ background: "var(--color-primary-100)" }}>
      <div className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, (val / max) * 100)}%`, background: color }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════ */
export default function LibraryPage() {
  const t = useTranslations();

  const [meals]          = useState(initialMeals);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search,         setSearch]         = useState("");
  const [selected,       setSelected]       = useState(null);
  const [sortBy,         setSortBy]         = useState("name");

  const filtered = useMemo(() =>
    meals
      .filter(m =>
        (activeCategory === "All" || m.category === activeCategory) &&
        (m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.ingredients.some(i => i.name.toLowerCase().includes(search.toLowerCase())))
      )
      .sort((a, b) => {
        if (sortBy === "calories") return a.calories - b.calories;
        if (sortBy === "time")     return a.time - b.time;
        if (sortBy === "protein")  return b.macros.protein - a.macros.protein;
        return a.name.localeCompare(b.name);
      }),
    [meals, activeCategory, search, sortBy]
  );

  const allCats   = ["All", ...categories];
  const avgCal    = Math.round(meals.reduce((s, m) => s + m.calories,       0) / meals.length);
  const avgProt   = Math.round(meals.reduce((s, m) => s + m.macros.protein, 0) / meals.length);

  return (
    <div className="min-h-screen" style={{ background: "var(--color-primary-50)" }}>
      <style>{`
        @keyframes fadeUp  { from { transform:translateY(14px); opacity:0 } to { transform:translateY(0); opacity:1 } }
        @keyframes slideUp { from { transform:translateY(28px); opacity:0 } to { transform:translateY(0); opacity:1 } }
      `}</style>

      {/* ══ HERO ══════════════════════════════════════════════ */}
      <header className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, var(--color-primary-950, #0f172a) 0%, var(--color-primary-900, #1e293b) 100%)" }}>

        {/* decorative blobs */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 25% 60%, color-mix(in srgb, var(--color-gradient-from) 12%, transparent) 0%, transparent 65%)" }} />
        <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: "color-mix(in srgb, var(--color-gradient-from) 8%, transparent)" }} />
        <div className="absolute -bottom-20 right-24 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: "color-mix(in srgb, var(--color-gradient-to) 6%, transparent)" }} />

        <div className="max-w-6xl mx-auto px-6 py-14 relative">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10 flex-wrap">

            {/* left: title */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl grid place-items-center shadow-lg"
                  style={{ background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))" }}>
                  <ChefHat className="w-4.5 h-4.5 text-white" />
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.22em]"
                  style={{ color: "var(--color-primary-400)" }}>
                  {t("library.hero.eyebrow")}
                </span>
              </div>

              <h1 className="text-5xl font-bold leading-[1.08] mb-4" style={{ color: "white" }}>
                {t("library.hero.title_plain")}{" "}
                <span style={{
                  background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-via, var(--color-gradient-to)))",
                  WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
                }}>
                  {t("library.hero.title_accent")}
                </span>
              </h1>

              <p className="text-sm leading-relaxed max-w-[400px]"
                style={{ color: "var(--color-primary-400)" }}>
                {t("library.hero.subtitle")}
              </p>
            </div>

            {/* right: stat cards */}
            <div className="flex gap-3 flex-wrap">
              {[
                { icon: "🥗", val: meals.length, label: t("library.stats.total")   },
                { icon: "🔥", val: avgCal,        label: t("library.stats.avg_cal") },
                { icon: "💪", val: `${avgProt}g`, label: t("library.stats.avg_prot")},
              ].map(({ icon, val, label }) => (
                <div key={label}
                  className="rounded-2xl border px-5 py-4 text-center min-w-[90px]"
                  style={{ background: "rgba(255,255,255,0.055)", borderColor: "rgba(255,255,255,0.09)" }}>
                  <div className="text-2xl mb-1">{icon}</div>
                  <div className="text-xl font-bold"
                    style={{ color: "var(--color-gradient-from)" }}>{val}</div>
                  <div className="text-[11px] uppercase tracking-wider mt-0.5"
                    style={{ color: "var(--color-primary-500)" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ══ BODY ══════════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-6 py-9">

        {/* search + sort */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-56">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: "var(--color-primary-400)" }} />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("library.search.placeholder")}
              className="ps-9 h-10 rounded-xl bg-white text-sm"
              style={{ borderColor: "var(--color-primary-200)" }}
            />
          </div>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48 h-10 rounded-xl bg-white text-sm gap-1.5"
              style={{ borderColor: "var(--color-primary-200)" }}>
              <SlidersHorizontal className="w-3.5 h-3.5 flex-shrink-0"
                style={{ color: "var(--color-primary-400)" }} />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">     {t("library.sort.name")}    </SelectItem>
              <SelectItem value="calories"> {t("library.sort.calories")}</SelectItem>
              <SelectItem value="time">     {t("library.sort.time")}    </SelectItem>
              <SelectItem value="protein">  {t("library.sort.protein")} </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* category pills */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {allCats.map(cat => {
            const active = activeCategory === cat;
            const col    = cat === "All" ? "var(--color-gradient-from)" : catColor(cat);
            return (
              <button key={cat}
                onClick={() => setActiveCategory(cat)}
                className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold
                           transition-all duration-150 hover:scale-105 active:scale-95"
                style={{
                  borderColor: active ? col : "var(--color-primary-200)",
                  background:  active ? col : "white",
                  color:       active ? "white" : "var(--color-primary-600)",
                }}>
                {cat !== "All" && <span>{catIcon(cat)}</span>}
                {cat === "All" ? t("library.categories.all") : t(`library.categories.${cat.toLowerCase()}`)}
                {cat !== "All" && (
                  <span className="text-[10px] rounded-full px-1.5 py-0.5 font-bold"
                    style={{
                      background: active ? "rgba(255,255,255,0.25)" : "var(--color-primary-100)",
                      color:      active ? "white" : "var(--color-primary-500)",
                    }}>
                    {meals.filter(m => m.category === cat).length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* results count */}
        <p className="text-xs font-medium mb-5" style={{ color: "var(--color-primary-500)" }}>
          {t("library.results.count", { count: filtered.length })}
          {search && <> {t("library.results.for", { query: search })}</>}
        </p>

        {/* ── meal grid ───────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
          style={{ animation: "fadeUp 0.3s ease" }}>

          {filtered.map(meal => (
            <article key={meal.id}
              onClick={() => setSelected(meal)}
              className="bg-white rounded-2xl overflow-hidden border cursor-pointer group
                         hover:-translate-y-1.5 transition-all duration-250"
              style={{
                borderColor: "var(--color-primary-150, var(--color-primary-200))",
                boxShadow: "0 2px 14px rgba(15,23,42,0.06)",
              }}>

              {/* image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={meal.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80"}
                  alt={meal.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0"
                  style={{ background: "linear-gradient(to top, rgba(15,23,42,0.65) 0%, transparent 55%)" }} />

                {/* category badge */}
                <div className="absolute top-3 start-3">
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
                    style={{ background: catColor(meal.category), color: "white" }}>
                    {catIcon(meal.category)}
                    {t(`library.categories.${meal.category.toLowerCase()}`)}
                  </span>
                </div>

                {/* title + kcal overlay */}
                <div className="absolute bottom-3 start-4 end-4 flex justify-between items-end gap-2">
                  <h3 className="text-white text-base font-bold leading-tight">{meal.name}</h3>
                  <div className="rounded-lg px-2.5 py-1 text-right flex-shrink-0"
                    style={{ background: "rgba(15,23,42,0.72)" }}>
                    <div className="text-sm font-bold tabular-nums"
                      style={{ color: "var(--color-gradient-from)" }}>{meal.calories}</div>
                    <div className="text-[9px] uppercase tracking-wider"
                      style={{ color: "rgba(255,255,255,0.45)" }}>{t("library.card.kcal")}</div>
                  </div>
                </div>
              </div>

              {/* card body */}
              <div className="p-4 space-y-3">

                {/* meta row */}
                <div className="flex gap-3 pb-3 border-b flex-wrap"
                  style={{ borderColor: "var(--color-primary-100)" }}>
                  {[
                    [Clock,    `${meal.time} ${t("library.card.min")}`],
                    [Users,    `${meal.servings} ${t("library.card.serving")}`],
                    [BarChart2, t(`library.satiety.${meal.satiety.toLowerCase()}`)],
                  ].map(([Icon, val], idx) => (
                    <span key={idx} className="flex items-center gap-1 text-xs"
                      style={{ color: "var(--color-primary-500)" }}>
                      <Icon className="w-3 h-3" /> {val}
                    </span>
                  ))}
                </div>

                {/* macro bars */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: "var(--color-primary-400)" }}>
                    {t("library.card.macros_label")}
                  </p>
                  {[
                    [t("library.macros.carbs"),   meal.macros.carbs,   80, "#E8956D"],
                    [t("library.macros.protein"), meal.macros.protein, 60, "#5B8A5F"],
                    [t("library.macros.fats"),    meal.macros.fats,    40, "#6B5EA8"],
                  ].map(([label, val, max, col]) => (
                    <div key={label}>
                      <div className="flex justify-between mb-1">
                        <span className="text-[11px]" style={{ color: "var(--color-primary-500)" }}>{label}</span>
                        <span className="text-[11px] font-bold tabular-nums" style={{ color: col }}>{val}g</span>
                      </div>
                      <MacroBar val={val} max={max} color={col} />
                    </div>
                  ))}
                </div>

                {/* ingredient tags */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2"
                    style={{ color: "var(--color-primary-400)" }}>
                    {t("library.card.key_ingredients")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {meal.ingredients.slice(0, 4).map((ing, i) => (
                      <span key={i}
                        className="rounded-md border px-2 py-0.5 text-[11px] font-medium"
                        style={{
                          borderColor: "var(--color-primary-200)",
                          background:  "var(--color-primary-50)",
                          color:       "var(--color-primary-600)",
                        }}>
                        {ing.name}
                      </span>
                    ))}
                    {meal.ingredients.length > 4 && (
                      <Badge variant="secondary"
                        className="text-[11px] font-bold px-2 py-0.5 rounded-md"
                        style={{ background: catBg(meal.category), color: catColor(meal.category), border: "none" }}>
                        +{meal.ingredients.length - 4} {t("library.card.more")}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-24 gap-3">
            <div className="text-5xl">🍽️</div>
            <p className="text-lg font-bold" style={{ color: "var(--color-primary-700)" }}>
              {t("library.empty.title")}
            </p>
            <p className="text-sm" style={{ color: "var(--color-primary-400)" }}>
              {t("library.empty.subtitle")}
            </p>
          </div>
        )}
      </div>

      {/* ══ DETAIL MODAL ══════════════════════════════════════ */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent
          className="max-w-2xl p-0 overflow-hidden rounded-2xl border gap-0"
          style={{ borderColor: "var(--color-primary-200)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
          // hide default shadcn close button — we render our own in the image
          hideCloseButton
        >
          {selected && (
            <>
              {/* hero image */}
              <div className="relative h-56 flex-shrink-0 overflow-hidden">
                <img
                  src={selected.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80"}
                  alt={selected.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0"
                  style={{ background: "linear-gradient(to top, rgba(15,23,42,0.78) 0%, transparent 52%)" }} />

                {/* close */}
                <button
                  onClick={() => setSelected(null)}
                  aria-label={t("library.modal.close")}
                  className="absolute top-4 end-4 w-9 h-9 rounded-full border grid place-items-center
                             transition-colors hover:bg-rose-500 hover:border-rose-500"
                  style={{ background: "rgba(15,23,42,0.65)", borderColor: "rgba(255,255,255,0.15)", color: "white" }}>
                  <X className="w-4 h-4" />
                </button>

                {/* category */}
                <div className="absolute top-4 start-4">
                  <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold"
                    style={{ background: catColor(selected.category), color: "white" }}>
                    {catIcon(selected.category)}
                    {t(`library.categories.${selected.category.toLowerCase()}`)}
                  </span>
                </div>

                {/* title + kcal */}
                <div className="absolute bottom-4 start-5 end-5 flex justify-between items-end gap-3">
                  <div>
                    <h2 className="text-white text-2xl font-bold mb-1.5 leading-tight">{selected.name}</h2>
                    <div className="flex gap-4 flex-wrap">
                      {[
                        [Clock,    `${selected.time} ${t("library.card.min")}`],
                        [Users,    `${selected.servings} ${t("library.card.serving")}`],
                        [BarChart2, `${t(`library.satiety.${selected.satiety.toLowerCase()}`)} ${t("library.modal.satiety_suffix")}`],
                      ].map(([Icon, val], i) => (
                        <span key={i} className="flex items-center gap-1 text-xs"
                          style={{ color: "rgba(255,255,255,0.72)" }}>
                          <Icon className="w-3 h-3" /> {val}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-end flex-shrink-0">
                    <div className="text-3xl font-bold tabular-nums"
                      style={{ color: "var(--color-gradient-from)" }}>{selected.calories}</div>
                    <div className="text-[10px] uppercase tracking-wider"
                      style={{ color: "rgba(255,255,255,0.45)" }}>{t("library.card.kcal")}</div>
                  </div>
                </div>
              </div>

              {/* scrollable body */}
              <div className="overflow-y-auto p-6 space-y-6 flex-1"
                style={{ background: "var(--color-primary-50)" }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                  {/* ingredients list */}
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider mb-3"
                      style={{ color: "var(--color-primary-700)" }}>
                      {t("library.modal.ingredients")}
                    </h3>
                    <div className="space-y-2">
                      {selected.ingredients.map((ing, i) => (
                        <div key={i}
                          className="flex items-center justify-between rounded-xl px-3 py-2.5 border bg-white"
                          style={{ borderColor: "var(--color-primary-150, var(--color-primary-200))" }}>
                          <span className="text-sm" style={{ color: "var(--color-primary-800)" }}>{ing.name}</span>
                          <span className="text-sm font-bold tabular-nums"
                            style={{ color: "var(--color-gradient-from)" }}>
                            {ing.amount} {ing.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* nutrition + tips */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider mb-3"
                        style={{ color: "var(--color-primary-700)" }}>
                        {t("library.modal.nutrition_title")}
                      </h3>

                      {/* dark nutrition card */}
                      <div className="rounded-2xl p-5 space-y-3"
                        style={{ background: "linear-gradient(135deg, var(--color-primary-950, #0f172a), var(--color-primary-900, #1e293b))" }}>
                        <div className="flex justify-between items-center">
                          <span className="text-xs uppercase tracking-wider"
                            style={{ color: "var(--color-primary-400)" }}>
                            {t("library.modal.calories")}
                          </span>
                          <span className="text-2xl font-bold tabular-nums"
                            style={{ color: "var(--color-gradient-from)" }}>
                            {selected.calories}
                          </span>
                        </div>

                        <Separator style={{ borderColor: "rgba(255,255,255,0.08)" }} />

                        {[
                          [t("library.macros.carbs"),         selected.macros.carbs   + "g", "#E8956D"],
                          [t("library.macros.protein"),       selected.macros.protein + "g", "#5B8A5F"],
                          [t("library.macros.fats"),          selected.macros.fats    + "g", "#6B5EA8"],
                        ].map(([label, val, col]) => (
                          <div key={label} className="flex justify-between items-center">
                            <span className="text-xs" style={{ color: "var(--color-primary-400)" }}>{label}</span>
                            <span className="text-sm font-bold" style={{ color: col }}>{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* coach tip */}
                    {selected.tips && (
                      <div className="rounded-xl p-4 border"
                        style={{ background: "var(--color-primary-50)", borderColor: "var(--color-primary-200)" }}>
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="w-3.5 h-3.5" style={{ color: "#C4943A" }} />
                          <span className="text-xs font-bold uppercase tracking-wider"
                            style={{ color: "#C4943A" }}>
                            {t("library.modal.coach_tip")}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed"
                          style={{ color: "var(--color-primary-700)" }}>
                          {selected.tips}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}