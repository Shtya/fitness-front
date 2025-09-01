'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Images, Shuffle, Image as ImageIcon } from 'lucide-react';

export function ExerciseSubTabs({ exercise, allExercises, currentExId, onPickAlternative, initialTab = 'media' }) {
  const [tab, setTab] = useState(initialTab);

  const tabs = [
    { key: 'media', label: 'Media', icon: Images },
    { key: 'alternatives', label: 'Alternatives', icon: Shuffle },
  ];

  const alternatives = useMemo(
    () => (allExercises || []).filter(e => e.id !== exercise?.id).slice(0, 6),
    [allExercises, exercise?.id]
  );

  return (
    <div className='px-2 pt-3'>
      {/* Tabs header */}
      <div className='relative mb-2'>
        <div className='flex items-center gap-2 rounded-xl bg-slate-100 p-1.5'>
          {tabs.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`cursor-pointer relative flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition
                  ${active ? 'text-indigo-700' : 'text-slate-600 hover:text-slate-800'}`}
                aria-selected={active}
                role="tab"
              >
                <Icon size={16} />
                {label}
                {active && (
                  <motion.span
                    layoutId="tabActivePill"
                    className="absolute inset-0 -z-10 rounded-lg bg-white shadow"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
              </button>
            );
          })}
          <div className='ml-auto text-xs text-slate-500 select-none'>
            {exercise?.targetSets} sets • {exercise?.targetReps} reps
          </div>
        </div>
      </div>

      {/* Panels */}
      <div role="tabpanel" className='py-3'>
        {tab === 'alternatives' && (
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            {alternatives.map(alt => (
              <motion.div
                key={alt.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                className='group p-3 border border-slate-200 rounded-2xl bg-white hover:shadow-md transition'
              >
                <div className='flex items-center gap-3'>
                  <div className='w-14 h-14 rounded-xl bg-slate-100 grid place-items-center overflow-hidden border border-slate-200'>
                    {alt.img ? (
                      <img src={alt.img} alt={alt.name} className='w-full h-full object-cover group-hover:scale-105 transition' />
                    ) : (
                      <Dumbbell size={18} className='text-slate-500' />
                    )}
                  </div>
                  <div className='min-w-0 flex-1'>
                    <div className='text-sm font-medium truncate'>{alt.name}</div>
                    <div className='text-xs text-slate-500'>
                      Target: {alt.targetSets} × {alt.targetReps} • Rest {alt.rest ?? '—'}s
                    </div>
                  </div>
                  <button
                    onClick={() => onPickAlternative(alt)}
                    className='text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50'
                  >
                    Use
                  </button>
                </div>
              </motion.div>
            ))}

            {!alternatives.length && (
              <div className='col-span-full'>
                <div className='rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500'>
                  <div className='mx-auto mb-2 w-10 h-10 rounded-full bg-slate-100 grid place-items-center'>
                    <ImageIcon size={16} className='text-slate-500' />
                  </div>
                  <div className='text-sm'>No alternatives configured for this day.</div>
                  <div className='mt-2 text-xs'>Add some in your plan to see them here.</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
