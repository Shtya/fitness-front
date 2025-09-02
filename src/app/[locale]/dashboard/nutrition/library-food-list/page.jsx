'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Repeat2, Tags, Copy, CheckCircle2, Calculator, Plus, Trash2, ChevronRight, Info } from 'lucide-react';

/* =================== STORAGE KEYS =================== */
const LS_LIBRARY = 'mw.nutri.library.v1'; // custom swaps created here
const LS_PREFS = 'mw.account.prefs.v1'; // to read substitutions from Profile & Preferences
const spring = { type: 'spring', stiffness: 220, damping: 26 };

/* =================== HELPERS =================== */
function loadLS(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function saveLS(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

/** Build an item quickly */
const F = (name, grams, kcal, p = 0, c = 0, f = 0, note = '') => ({ name, grams, kcal, p, c, f, note });

/** kCal per gram (safe even if grams==0) */
const kpg = x => (x.grams > 0 ? x.kcal / x.grams : 0);

/** Scale an equivalence chain: keep CALORIES equal to the base item's calories for the given base grams. */
function scaleChain(chain, baseGrams) {
  const base = chain[0];
  const baseCalories = kpg(base) * baseGrams;
  return chain.map((item, i) => {
    if (i === 0) return { ...item, grams: round(baseGrams, 0), kcal: round(baseCalories, 0) };
    const gramsNeeded = kpg(item) > 0 ? baseCalories / kpg(item) : 0;
    const scaled = { ...item, grams: round(gramsNeeded, 0), kcal: round(kpg(item) * gramsNeeded, 0) };
    // scale macros roughly by grams change
    const factor = item.grams > 0 ? gramsNeeded / item.grams : 0;
    return { ...scaled, p: round(item.p * factor, 1), c: round(item.c * factor, 1), f: round(item.f * factor, 1) };
  });
}

const round = (n, d = 0) => {
  const p = Math.pow(10, d);
  return Math.round((+n || 0) * p) / p;
};

/* =================== DEFAULT LIB =================== */
/** Each swap group = { id, title, tags, chain: [items...] }
 * Item: { name, grams, kcal, p, c, f, note? }
 * Macros are approximate & for coaching guidance (not a medical device).
 */
function defaultLibrary() {
  return [
    {
      id: 'carb-1',
      title: 'Carb: Rice ↔ Potato ↔ Pasta (cooked)',
      tags: ['carbs', 'grains', 'meal-prep', 'bulking', 'cutting'],
      chain: [F('White rice (cooked)', 100, 130, 2.5, 28.0, 0.3), F('Potato (boiled)', 120, 120, 2.6, 27.0, 0.1), F('Pasta (cooked)', 100, 155, 5.8, 30.0, 0.9)],
      note: 'Use these cooked weights. Swap by equal calories.',
    },
    {
      id: 'bread-1',
      title: 'Bread: 2 brown toast ↔ 1 baladi bread (approx.)',
      tags: ['carbs', 'bread', 'arabic'],
      chain: [F('Brown toast (2 slices)', 60, 160, 6, 28, 2, '≈30 g each'), F('Baladi bread (1 loaf)', 120, 300, 10, 62, 1.5, '≈120 g loaf')],
      note: 'Weigh if possible; bakery sizes vary.',
    },
    {
      id: 'dairy-1',
      title: 'Dairy/Protein: Greek yogurt ↔ Whey + milk',
      tags: ['protein', 'dairy', 'breakfast', 'snack'],
      chain: [F('Greek yogurt (plain, 2%)', 170, 140, 18, 6, 4), F('Whey isolate (1 scoop) + milk (60 ml)', 45, 140, 26, 3, 1.5, '≈30 g whey + 60 ml milk')],
      note: 'Choose the option that fits digestion & preference.',
    },
    {
      id: 'fruit-1',
      title: 'Fruit: Banana ↔ Strawberry ↔ Apple ↔ Guava ↔ Pear',
      tags: ['fruit', 'snack', 'carbs'],
      chain: [F('Banana', 150, 135, 1.7, 35, 0.5), F('Strawberry', 150, 48, 1.0, 11, 0.5), F('Apple', 150, 78, 0.3, 21, 0.3), F('Guava', 150, 112, 4.3, 23, 1.6), F('Pear', 150, 96, 0.6, 26, 0.3)],
      note: 'Fruits differ in calories; use the scaler to keep calories equal.',
    },
    {
      id: 'protein-1',
      title: 'Protein: Chicken ↔ White Fish ↔ Beef (lean)',
      tags: ['protein', 'main', 'meal-prep'],
      chain: [F('Chicken breast (cooked)', 150, 246, 46, 0, 5), F('White fish (cooked)', 150, 180, 38, 0, 2), F('Lean beef 5% (cooked)', 150, 310, 40, 0, 15)],
      note: 'Choose lean sources on cuts; scale fatier cuts appropriately.',
    },
    {
      id: 'fat-1',
      title: 'Fats: Nuts ↔ Olive oil ↔ Peanut butter',
      tags: ['fats', 'snack', 'toppings'],
      chain: [F('Mixed nuts', 10, 60, 2, 2, 5), F('Olive oil', 6, 50, 0, 0, 5.6), F('Peanut butter', 12, 70, 3, 2, 5.6)],
      note: 'Small changes in fats swing calories a lot—measure carefully.',
    },
  ];
}

/* =================== PAGE =================== */
export default function FoodLibraryPage() {
  const [query, setQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [custom, setCustom] = useState([]); // user-defined groups (from this page)
  const [prefsSubs, setPrefsSubs] = useState([]); // read from profile prefs substitutions
  const [lib, setLib] = useState(defaultLibrary());
  const [copiedId, setCopiedId] = useState('');

  // scaler states per card (id -> grams)
  const [scalers, setScalers] = useState({}); // { groupId: gramsNumber }

  useEffect(() => {
    setCustom(loadLS(LS_LIBRARY, []));
    const prefs = loadLS(LS_PREFS, null);
    setPrefsSubs(prefs?.substitutions || []);
  }, []);
  useEffect(() => saveLS(LS_LIBRARY, custom), [custom]);

  const allTags = useMemo(() => {
    const fromLib = lib.concat(custom).flatMap(g => g.tags || []);
    const base = Array.from(new Set(fromLib)).sort();
    return ['all', ...base];
  }, [lib, custom]);

  const groups = useMemo(() => {
    const all = [...lib, ...custom];
    const q = query.trim().toLowerCase();
    return all.filter(g => {
      const matchQ = !q || g.title.toLowerCase().includes(q) || (g.chain || []).some(i => i.name.toLowerCase().includes(q));
      const matchT = tagFilter === 'all' || (g.tags || []).includes(tagFilter);
      return matchQ && matchT;
    });
  }, [lib, custom, query, tagFilter]);

  function copyGroup(g) {
    const txt = groupToText(g);
    navigator.clipboard?.writeText(txt).then(() => {
      setCopiedId(g.id);
      setTimeout(() => setCopiedId(''), 1200);
    });
  }

  function addCustomSkeleton() {
    const id = `c-${Math.random().toString(36).slice(2, 7)}`;
    setCustom(c => [
      ...c,
      {
        id,
        title: 'Custom swap',
        tags: ['custom'],
        chain: [F('Item A', 100, 100, 0, 20, 0), F('Item B', 100, 100, 0, 20, 0)],
        note: '',
      },
    ]);
  }
  function delCustom(id) {
    setCustom(c => c.filter(x => x.id !== id));
  }
  function updateCustom(id, updater) {
    setCustom(c => c.map(x => (x.id === id ? updater(structuredClone(x)) : x)));
  }

  function setScaler(groupId, grams) {
    setScalers(s => ({ ...s, [groupId]: clamp(+grams || 0, 0, 2000) }));
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
        <div className='flex items-center justify-between flex-wrap gap-3'>
          <div>
            <h1 className='text-2xl md:text-3xl font-bold text-slate-900'>Food Library / Substitutions</h1>
            <p className='text-sm text-slate-600 mt-1'>
              Allowed swaps with macro estimates. Scale to keep calories equal, then swap confidently. <span className='text-xs text-slate-500'>Tip: weigh after cooking.</span>
            </p>
          </div>
          <div className='inline-flex items-center gap-2'>
            <button onClick={addCustomSkeleton} className='rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 inline-flex items-center gap-2'>
              <Plus size={16} /> Add custom
            </button>
          </div>
        </div>
      </motion.div>

      {/* Search + tags */}
      <div className='rounded-2xl border border-slate-200 bg-white p-3'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
          <label className='relative'>
            <Search size={16} className='absolute left-2 top-1/2 -translate-y-1/2 text-slate-400' />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder='Search foods or titles…' className='h-10 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20' />
          </label>
          <div className='md:col-span-2 flex flex-wrap items-center gap-1.5'>
            <Tags size={16} className='text-slate-500' />
            {allTags.map(t => (
              <button key={t} onClick={() => setTagFilter(t)} className={`px-2.5 py-1.5 rounded-lg text-xs border transition ${t === tagFilter ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Prefs substitutions from Profile */}
      {prefsSubs?.length ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='rounded-2xl border border-slate-200 bg-white p-4'>
          <div className='flex items-center gap-2 mb-3 font-semibold'>
            <Repeat2 size={18} className='text-slate-700' /> Your saved substitutions
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3'>
            {prefsSubs.map(s => (
              <div key={s.id} className='rounded-xl border border-slate-200 p-3 text-sm'>
                <div className='font-medium text-slate-800 mb-1'>Quick swap</div>
                <div className='flex items-center text-slate-700'>
                  <span>{s.from}</span>
                  <ChevronRight size={14} className='mx-2 text-slate-400' />
                  <span>{s.to}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ) : null}

      {/* Library grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
        {groups.map(g => {
          const grams = scalers[g.id] ?? g.chain[0]?.grams ?? 100;
          const scaled = scaleChain(g.chain, grams);

          return (
            <motion.div key={g.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='rounded-2xl border border-slate-200 bg-white p-4'>
              <div className='flex items-start justify-between gap-2'>
                <div>
                  <div className='font-semibold'>{g.title}</div>
                  <div className='mt-1 flex flex-wrap gap-1.5'>
                    {(g.tags || []).map(t => (
                      <span key={t} className='px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-600'>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <button onClick={() => copyGroup({ ...g, chain: scaled })} className={`rounded-lg border px-2.5 py-1.5 text-xs ${copiedId === g.id ? 'border-green-200 text-green-700 bg-green-50' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                    {copiedId === g.id ? (
                      <span className='inline-flex items-center gap-1'>
                        <CheckCircle2 size={14} />
                        Copied
                      </span>
                    ) : (
                      <span className='inline-flex items-center gap-1'>
                        <Copy size={14} />
                        Copy
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Scaler */}
              <div className='mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3'>
                <div className='text-xs text-slate-600 mb-1 inline-flex items-center gap-1'>
                  <Calculator size={14} /> Scale by base item calories
                </div>
                <div className='grid grid-cols-2 gap-2'>
                  <label className='block'>
                    <span className='text-xs text-slate-500'>Base: {scaled[0]?.name}</span>
                    <input type='number' min={0} value={grams} onChange={e => setScaler(g.id, e.target.value)} className='mt-1 h-9 w-full rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20' />
                  </label>
                  <div className='rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm'>
                    <div className='text-slate-500 text-xs'>Calories</div>
                    <div className='font-semibold'>{scaled[0]?.kcal ?? '—'} kcal</div>
                  </div>
                </div>
              </div>

              {/* Chain */}
              <div className='mt-3 space-y-2'>
                {scaled.map((it, idx) => (
                  <div key={idx} className='rounded-xl border border-slate-200 p-3'>
                    <div className='text-sm font-medium text-slate-800'>{it.name}</div>
                    <div className='text-xs text-slate-500'>
                      {it.grams} g • {it.kcal} kcal {it.note ? `• ${it.note}` : ''}
                    </div>
                    <div className='mt-1 text-xs text-slate-600'>
                      P {it.p} g • C {it.c} g • F {it.f} g
                    </div>
                  </div>
                ))}
                {g.note ? (
                  <div className='text-[11px] text-slate-500 inline-flex items-center gap-1'>
                    <Info size={12} />
                    {g.note}
                  </div>
                ) : null}
              </div>

              {/* Custom editor if this is a custom card */}
              {g.id.startsWith('c-') && (
                <div className='mt-3 rounded-xl border border-dashed border-slate-300 p-3'>
                  <div className='text-xs font-medium mb-2'>Edit custom swap</div>
                  <input
                    value={g.title}
                    onChange={e =>
                      updateCustom(g.id, x => {
                        x.title = e.target.value;
                        return x;
                      })
                    }
                    className='h-9 w-full rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 mb-2'
                  />
                  {(g.chain || []).map((it, i) => (
                    <div key={i} className='grid grid-cols-5 gap-2 mb-2'>
                      <input
                        value={it.name}
                        onChange={e =>
                          updateCustom(g.id, x => {
                            x.chain[i].name = e.target.value;
                            return x;
                          })
                        }
                        className='col-span-2 h-9 rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                        placeholder='Name'
                      />
                      <input
                        type='number'
                        value={it.grams}
                        onChange={e =>
                          updateCustom(g.id, x => {
                            x.chain[i].grams = +e.target.value || 0;
                            return x;
                          })
                        }
                        className='h-9 rounded-md border border-slate-200 px-2 text-sm'
                        placeholder='g'
                      />
                      <input
                        type='number'
                        value={it.kcal}
                        onChange={e =>
                          updateCustom(g.id, x => {
                            x.chain[i].kcal = +e.target.value || 0;
                            return x;
                          })
                        }
                        className='h-9 rounded-md border border-slate-200 px-2 text-sm'
                        placeholder='kcal'
                      />
                      <input
                        value={it.note || ''}
                        onChange={e =>
                          updateCustom(g.id, x => {
                            x.chain[i].note = e.target.value;
                            return x;
                          })
                        }
                        className='h-9 rounded-md border border-slate-200 px-2 text-sm'
                        placeholder='note (opt)'
                      />
                      <div className='col-span-5 grid grid-cols-3 gap-2'>
                        <input
                          type='number'
                          step='0.1'
                          value={it.p}
                          onChange={e =>
                            updateCustom(g.id, x => {
                              x.chain[i].p = +e.target.value || 0;
                              return x;
                            })
                          }
                          className='h-9 rounded-md border border-slate-200 px-2 text-sm'
                          placeholder='Protein g'
                        />
                        <input
                          type='number'
                          step='0.1'
                          value={it.c}
                          onChange={e =>
                            updateCustom(g.id, x => {
                              x.chain[i].c = +e.target.value || 0;
                              return x;
                            })
                          }
                          className='h-9 rounded-md border border-slate-200 px-2 text-sm'
                          placeholder='Carbs g'
                        />
                        <input
                          type='number'
                          step='0.1'
                          value={it.f}
                          onChange={e =>
                            updateCustom(g.id, x => {
                              x.chain[i].f = +e.target.value || 0;
                              return x;
                            })
                          }
                          className='h-9 rounded-md border border-slate-200 px-2 text-sm'
                          placeholder='Fat g'
                        />
                      </div>
                    </div>
                  ))}
                  <div className='flex items-center justify-between'>
                    <button
                      onClick={() =>
                        updateCustom(g.id, x => {
                          x.chain.push(F('New item', 100, 100, 0, 20, 0));
                          return x;
                        })
                      }
                      className='rounded-lg border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50 inline-flex items-center gap-1'>
                      <Plus size={14} /> Add item
                    </button>
                    <button onClick={() => delCustom(g.id)} className='rounded-lg border border-rose-200 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50 inline-flex items-center gap-1'>
                      <Trash2 size={14} /> Delete swap
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Empty state */}
      {!groups.length && <div className='rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600'>No matches. Try a different search or tag.</div>}

      {/* Footer note */}
      <div className='text-xs text-slate-500'>Estimates for calories/macros are approximate and can vary by brand and cooking method. When in doubt, weigh food after cooking and check your product labels.</div>
    </div>
  );
}

/* =================== UTIL =================== */
function groupToText(g) {
  const lines = [];
  lines.push(`${g.title}`);
  (g.chain || []).forEach(it => {
    lines.push(`- ${it.name}: ${it.grams} g • ${it.kcal} kcal (P ${it.p} g • C ${it.c} g • F ${it.f} g)`);
  });
  if (g.note) lines.push(`Note: ${g.note}`);
  return lines.join('\n');
}
