/**
 * Planning on top of the stylist (pure): week planner, trip capsule, "buy next" gap analysis,
 * over-duplication, laundry and wardrobe stats.
 */
import {
  GAP_CANDIDATES,
  LAUNDRY_LIMITS,
  PALETTE_BY_ID,
  STYLIST_RULES,
  SUBCATEGORIES,
} from "../config/outfit-config.js";
import { colorDistance, describeColor } from "./color.js";
import { buildOutfits, itemHex, outfitItemList } from "./stylist.js";

const ymd = (date) => new Date(date).toISOString().slice(0, 10);

/**
 * A week (or `days`) of outfits without repeating a top or bottom, preferring less-worn pieces.
 * Returns [{ date, outfit }] (outfit may be null when the wardrobe runs out).
 */
export function weekPlan(
  items,
  ctx = {},
  { days = 7, start = Date.now(), keep = {} } = {},
) {
  const candidates = buildOutfits(items, ctx, { limit: 300, maxPerTop: 300 });
  const maxWorn = Math.max(
    1,
    ...items.map((item) => Number(item.timesWorn) || 0),
  );
  const used = new Set();
  const lastDay = new Map(); // piece id → day index it was last planned
  for (const outfit of Object.values(keep))
    for (const piece of outfitItemList(outfit || {}))
      if (["top", "bottom", "onepiece"].includes(piece.category))
        used.add(piece.id);
  const plan = [];
  for (let d = 0; d < days; d += 1) {
    const date = ymd(start + d * 86_400_000);
    if (keep[date]) {
      plan.push({ date, outfit: keep[date] });
      continue;
    }
    let best = null;
    let bestValue = -Infinity;
    // First try pieces not used this week; when the closet runs out, allow repeats that were
    // not worn in the previous two days.
    const pick = (strict) => {
      for (const outfit of candidates) {
        const core = outfitItemList(outfit).filter((piece) =>
          ["top", "bottom", "onepiece"].includes(piece.category),
        );
        if (
          strict
            ? core.some((piece) => used.has(piece.id))
            : core.some(
                (piece) =>
                  lastDay.has(piece.id) && d - lastDay.get(piece.id) <= 2,
              )
        )
          continue;
        // Rotation: lightly favour pieces you wear less.
        const rotation =
          core.reduce(
            (sum, piece) =>
              sum + (1 - (Number(piece.timesWorn) || 0) / maxWorn),
            0,
          ) * 2;
        const value = outfit.score + rotation;
        if (value > bestValue) {
          bestValue = value;
          best = outfit;
        }
      }
    };
    pick(true);
    if (!best) pick(false);
    if (best) {
      for (const piece of outfitItemList(best)) {
        if (!["top", "bottom", "onepiece"].includes(piece.category)) continue;
        used.add(piece.id);
        lastDay.set(piece.id, d);
      }
    }
    plan.push({ date, outfit: best });
  }
  return plan;
}

/**
 * Trip capsule: the fewest pieces that make the most good outfits. Greedy: start from the best
 * outfit, then keep adding the owned piece that unlocks the most new good outfits.
 * options: { days, weather, occasions[] }.
 */
export function tripCapsule(
  items,
  ctx = {},
  { days = 4, occasions = ["casual"] } = {},
) {
  const good = STYLIST_RULES.goodOutfit - 5;
  const all = [];
  for (const occasion of occasions) {
    for (const outfit of buildOutfits(
      items,
      { ...ctx, occasion },
      { limit: 300, maxPerTop: 300, requireClean: false },
    )) {
      if (outfit.score >= good) all.push({ ...outfit, occasion });
    }
  }
  if (!all.length) return { pieces: [], outfits: [] };
  const chosen = new Set(outfitItemList(all[0]).map((piece) => piece.id));
  const target = Math.max(days, occasions.length + 1);
  const maxPieces = Math.min(14, 4 + Math.ceil(days * 1.2));
  const covered = () =>
    all.filter((outfit) =>
      outfitItemList(outfit).every((piece) => chosen.has(piece.id)),
    );
  while (covered().length < target && chosen.size < maxPieces) {
    let bestPiece = null;
    let bestGain = 0;
    const candidates = new Set(
      all
        .flatMap((outfit) => outfitItemList(outfit).map((piece) => piece.id))
        .filter((id) => !chosen.has(id)),
    );
    for (const id of candidates) {
      chosen.add(id);
      const gain = covered().length;
      chosen.delete(id);
      if (gain > bestGain) {
        bestGain = gain;
        bestPiece = id;
      }
    }
    if (!bestPiece) {
      // No single piece completes a new outfit: add the whole next-best outfit.
      const next = all.find(
        (outfit) =>
          !outfitItemList(outfit).every((piece) => chosen.has(piece.id)),
      );
      if (!next) break;
      for (const piece of outfitItemList(next)) chosen.add(piece.id);
    } else chosen.add(bestPiece);
  }
  const byId = new Map(items.map((item) => [item.id, item]));
  const outfits = covered();
  const seen = new Set();
  return {
    pieces: [...chosen].map((id) => byId.get(id)).filter(Boolean),
    outfits: outfits
      .filter((outfit) => (seen.has(outfit.id) ? false : seen.add(outfit.id)))
      .slice(0, Math.max(days, 6)),
  };
}

function virtualItem(candidate) {
  const sub = SUBCATEGORIES[candidate.subcategory];
  const hex = PALETTE_BY_ID[candidate.color]?.hex;
  return {
    id: `__buy__${candidate.subcategory}-${candidate.color}`,
    category: sub.category,
    subcategory: candidate.subcategory,
    colors: { primary: { hex } },
    pattern: "solid",
    fit: candidate.fit,
    formality: sub.formality,
    seasons: [],
    status: "clean",
  };
}

/** "Buy next": the 3 candidate pieces that unlock the most new good outfits. */
export function gapAnalysis(items, ctx = {}) {
  const active = items.filter((item) => item.status !== "archived");
  const good = STYLIST_RULES.goodOutfit;
  const baseline = new Set(
    buildOutfits(active, ctx, {
      limit: 500,
      maxPerTop: 500,
      requireClean: false,
    })
      .filter((outfit) => outfit.score >= good)
      .map((outfit) => outfit.id),
  );
  const results = [];
  for (const candidate of GAP_CANDIDATES) {
    const virtual = virtualItem(candidate);
    // Skip what you already own (same type, very close colour).
    if (
      active.some(
        (item) =>
          item.subcategory === candidate.subcategory &&
          colorDistance(itemHex(item), itemHex(virtual)) < 10,
      )
    )
      continue;
    const outfits = buildOutfits([...active, virtual], ctx, {
      anchors: [virtual],
      limit: 200,
      maxPerTop: 200,
      requireClean: false,
    }).filter((outfit) => outfit.score >= good && !baseline.has(outfit.id));
    if (!outfits.length) continue;
    const partners = new Set(
      outfits
        .flatMap((outfit) => outfitItemList(outfit).map((piece) => piece.id))
        .filter((id) => id !== virtual.id),
    );
    results.push({
      ...candidate,
      newOutfits: outfits.length,
      partners: partners.size,
      example: outfits[0],
    });
  }
  results.sort(
    (a, b) => b.newOutfits - a.newOutfits || b.partners - a.partners,
  );
  return results.slice(0, 3);
}

/** Groups of 3+ pieces of the same sub-category in nearly the same colour. */
export function overDuplicated(items) {
  const groups = [];
  const active = items.filter((item) => item.status !== "archived");
  const used = new Set();
  for (const item of active) {
    if (used.has(item.id)) continue;
    const twins = active.filter(
      (other) =>
        other.subcategory === item.subcategory &&
        colorDistance(itemHex(other), itemHex(item)) < 10,
    );
    if (twins.length >= 3) {
      for (const twin of twins) used.add(twin.id);
      groups.push(twins);
    }
  }
  return groups;
}

/** Near-duplicates of a new item: same category, close colour, similar photo hash (if given). */
export function findDuplicates(candidate, items, hamming) {
  return items.filter((item) => {
    if (item.id === candidate.id || item.category !== candidate.category)
      return false;
    if (colorDistance(itemHex(item), itemHex(candidate)) >= 8) return false;
    if (candidate.hash && item.hash && hamming)
      return (
        hamming(candidate.hash, item.hash) <= 14 ||
        item.subcategory === candidate.subcategory
      );
    return item.subcategory === candidate.subcategory;
  });
}

/** "I wore this": counters, wear log, and the laundry pile after N wears. */
export function markWorn(item, when = Date.now(), limits = LAUNDRY_LIMITS) {
  const date = ymd(when);
  const wears = (Number(item.wearsSinceWash) || 0) + 1;
  const limit = limits[item.category] ?? 0;
  return {
    ...item,
    timesWorn: (Number(item.timesWorn) || 0) + 1,
    lastWorn: date,
    wearLog: [...(item.wearLog || []), date].slice(-200),
    wearsSinceWash: wears,
    status:
      limit && wears >= limit
        ? "laundry"
        : item.status === "archived"
          ? "archived"
          : "clean",
  };
}

export function markWashed(item) {
  return {
    ...item,
    wearsSinceWash: 0,
    status: item.status === "archived" ? "archived" : "clean",
  };
}

export function costPerWear(item) {
  const price = Number(item.price);
  if (!price) return null;
  return (
    Math.round((price / Math.max(1, Number(item.timesWorn) || 0)) * 100) / 100
  );
}

/** Wardrobe stats for the insights sheet. */
export function wardrobeStats(items) {
  const active = items.filter((item) => item.status !== "archived");
  const byCategory = {};
  const byFamily = {};
  const byColor = {};
  for (const item of active) {
    byCategory[item.category] = (byCategory[item.category] || 0) + 1;
    const d = describeColor(itemHex(item));
    if (d) {
      byFamily[d.family] = (byFamily[d.family] || 0) + 1;
      byColor[d.id] = byColor[d.id] || { id: d.id, hex: d.named.hex, count: 0 };
      byColor[d.id].count += 1;
    }
  }
  const worn = active
    .slice()
    .sort((a, b) => (Number(b.timesWorn) || 0) - (Number(a.timesWorn) || 0));
  return {
    total: active.length,
    byCategory,
    byFamily,
    colors: Object.values(byColor).sort((a, b) => b.count - a.count),
    mostWorn: worn.slice(0, 3),
    leastWorn: worn.slice(-3).reverse(),
    neverWorn: active.filter((item) => !Number(item.timesWorn)).length,
    laundry: active.filter((item) => item.status === "laundry").length,
  };
}
