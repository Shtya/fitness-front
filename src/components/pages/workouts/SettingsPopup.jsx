import { DEFAULT_SOUNDS } from "@/app/[locale]/dashboard/my/workouts/page";
import { AnimatePresence , motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {   X, Play,  Settings as SettingsIcon, Square  } from 'lucide-react';


export function SettingsPopup({ open, onClose, currentSound, onChange, sounds = DEFAULT_SOUNDS }) {
  const [sel, setSel] = useState(currentSound || sounds[0]);
  const [playingUrl, setPlayingUrl] = useState(null); // which  sound is currently playing
  const audioRef = useRef(null);

  useEffect(() => {
    setSel(currentSound || sounds[0]);
  }, [currentSound, sounds]);

  // Cleanup audio on unmount/close
  useEffect(() => {
    if (!open) stopAudio();
    return () => stopAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const stopAudio = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {}
      audioRef.current = null;
    }
    setPlayingUrl(null);
  };

  const playAudio = async url => {
    // if clicking the currently playing item => stop it
    if (playingUrl === url) {
      stopAudio();
      return;
    }
    // stop any previous sound
    stopAudio();
    // start new sound
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setPlayingUrl(null);
    try {
      await audio.play();
      setPlayingUrl(url);
    } catch {
      // autoplay blocked or other error
      setPlayingUrl(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='fixed inset-0 z-[80] bg-black/30'>
          <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} className='mx-auto mt-24 w-[92%] max-w-md rounded-lg border border-slate-200 bg-white shadow-xl' role='dialog' aria-modal='true' aria-label='Settings'>
            {/* Header */}
            <div className='p-3 border-b border-slate-100 flex items-center justify-between'>
              <div className='font-semibold flex items-center gap-2'>
                <SettingsIcon size={18} /> Settings
              </div>
              <button onClick={onClose} className='p-2 rounded-lg hover:bg-slate-100' aria-label='Close'>
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className='p-4 space-y-3'>
              <div className='text-sm font-medium'>Alert sound</div>

              {/* Scrollable list: fixed height 300px with overflow */}
              <div className='h-[300px] overflow-auto rounded-lg border border-slate-200'>
                <ul className='divide-y divide-slate-200'>
                  {sounds.map((url, i) => {
                    const isSelected = sel === url;
                    const isPlaying = playingUrl === url;
                    return (
                      <li
                        key={url}
                        className={`flex items-center justify-between gap-3 px-3 py-2 cursor-pointer
                          ${isSelected ? 'bg-indigo-50/60' : 'bg-white hover:bg-slate-50'}`}
                        onClick={() => setSel(url)}
                        aria-selected={isSelected}>
                        <div className='flex items-center gap-2'>
                          <span className={`inline-block h-2 w-2 rounded-full ${isSelected ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                          <span className='text-sm'>{`Sound ${i + 1}`}</span>
                          {isSelected && <span className='ml-1 text-[11px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700'>Selected</span>}
                          {isPlaying && <span className='ml-1 text-[11px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700'>Playing</span>}
                        </div>

                        <button
                          type='button'
                          onClick={e => {
                            e.stopPropagation();
                            playAudio(url);
                          }}
                          className='p-2 rounded-lg hover:bg-slate-100'
                          aria-label={isPlaying ? 'Stop preview' : 'Play preview'}>
                          {isPlaying ? <Square size={16} /> : <Play size={16} />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Footer */}
              <div className='flex items-center justify-end gap-2 pt-2'>
                <button
                  onClick={() => {
                    stopAudio();
                    onClose();
                  }}
                  className='px-3 py-1.5 rounded-lg border border-slate-200 text-sm hover:bg-slate-50'>
                  Cancel
                </button>
                <button
                  onClick={() => {
                    stopAudio();
                    onChange(sel);
                    onClose();
                  }}
                  className='px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm hover:bg-indigo-100'>
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}