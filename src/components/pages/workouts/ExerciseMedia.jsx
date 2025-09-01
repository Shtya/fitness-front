'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, Play, Video as VideoIcon } from 'lucide-react';

/*
  Notes:
  - Uses native <video> (as you asked), with pretty overlay & thumbnails (squares).
  - Works on mobile: responsive, taps, no layout shift.
*/
export function ExerciseMedia({ exercise, items }) {
  const [idx, setIdx] = useState(0);

  const media = useMemo(() => {
    const arr = Array.isArray(items) ? items : items ? [items] : [];
    return arr.map(m => {
      if (typeof m === 'string') return { type: 'img', src: m };
      return { type: m?.type === 'video' ? 'video' : 'img', src: m?.src };
    });
  }, [items]);

  const active = media[idx];
  const pickSrc = src => (Array.isArray(src) ? src.find(Boolean) : src);
  const videoUrl = active?.type === 'video' ? pickSrc(active.src) : undefined;
  const imageUrl = active?.type === 'img' ? pickSrc(active.src) : undefined;

  return (
    <div className='relative'>
      {/* Main viewer */}
      <motion.div key={idx + (pickSrc(active?.src) || '')} initial={{ opacity: 0.4, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 180, damping: 22 }} className='aspect-video bg-slate-900 grid place-items-center overflow-hidden shadow-lg relative rounded-2xl'>
        {videoUrl ? (
          <div className='relative w-full h-full group'>
            <video src={videoUrl} controls playsInline className='w-full h-full object-cover transition-transform duration-300' poster={exercise?.img} />
            <div className='absolute pointer-events-none inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20' />
            <div className='absolute pointer-events-none inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition'>
              <div className='bg-black/50 p-4 rounded-full backdrop-blur-sm'>
                <Play size={36} className='text-white' />
              </div>
            </div>
          </div>
        ) : imageUrl ? (
          <img src={imageUrl} alt={exercise?.name || 'exercise'} className='w-full h-full object-cover' loading='lazy' />
        ) : (
          <ImageIcon size={48} className='text-slate-400' />
        )}
      </motion.div>

      {/* Header + square bullets (thumbnails) */}
      <div className='relative py-2 px-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h3 className='font-semibold text-lg'>{exercise?.name}</h3>
          <p className='text-xs text-slate-500'>
            Target: {exercise?.targetSets} × {exercise?.targetReps} • Rest {exercise?.rest}s
          </p>
        </div>

        {media.length > 1 && (
          <div className='flex items-center gap-2 '>
            {media.map((m, i) => {
              const thumb = pickSrc(m.src);
              return (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={` cursor-pointer w-14 h-12 flex-none rounded-md overflow-hidden border-2 transition-all shrink-0
                    ${i === idx ? 'border-indigo-600 shadow-md scale-105' : 'border-transparent opacity-75 hover:opacity-100'}`}
                  title={`Media ${i + 1}`}>
                  {m.type === 'img' && thumb ? (
                    <img src={thumb} alt={`thumb-${i}`} className='w-full h-full object-cover' />
                  ) : m.type === 'video' && thumb ? (
                    <div className='relative w-full h-full bg-black'>
                      <video src={thumb} className='w-full h-full object-cover' muted playsInline />
                      <div className='absolute inset-0 bg-black/40 flex items-center justify-center'>
                        <VideoIcon size={18} className='text-white' />
                      </div>
                    </div>
                  ) : (
                    <div className='w-full h-full grid place-items-center bg-slate-200'>
                      <ImageIcon size={18} className='text-slate-400' />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
