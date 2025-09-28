import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Eye, EyeOff, Headphones, Pause, Play, Radio, RotateCw, Volume2, VolumeX, X, ExternalLink } from 'lucide-react';

/* ---------- tiny localStorage hook (JS) ---------- */
function useLS(key, initialValue) {
  const get = () => {
    try {
      const v = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      return v !== null ? JSON.parse(v) : initialValue;
    } catch {
      return initialValue;
    }
  };
  const [val, setVal] = useState(get);
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }, [key, val]);
  return [val, setVal];
}

/* ---------- youtube helpers ---------- */
const getYouTubeId = u => {
  try {
    const url = new URL(u);
    if (url.hostname.includes('youtube.com')) return url.searchParams.get('v');
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1);
  } catch {}
  return null;
};

const normalizeYouTube = arr =>
  (arr || []).map((item, idx) => {
    const id = getYouTubeId(item) || `yt_${idx}`;
    return {
      id,
      url: item,
      title: `Podcast ${idx + 1}`,
      // we will use the Player API instead of static iframe; keep embed for fallback if you want
      embed: id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1` : '',
      thumb: id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '',
    };
  });

/* ---------- YouTube Player (IFrame API) ---------- */
let YT_API_LOADING = false;
let YT_API_READY = false;
const ensureYTApi = () =>
  new Promise(resolve => {
    if (YT_API_READY && window.YT && window.YT.Player) return resolve(true);
    if (YT_API_LOADING) {
      const check = setInterval(() => {
        if (YT_API_READY && window.YT && window.YT.Player) {
          clearInterval(check);
          resolve(true);
        }
      }, 50);
      return;
    }
    YT_API_LOADING = true;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    window.onYouTubeIframeAPIReady = () => {
      YT_API_READY = true;
      resolve(true);
    };
    document.head.appendChild(tag);
  });

function YouTubePlayer({ videoId, onReadyQuality = 'hd720', className }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureYTApi();
      if (cancelled) return;
      // create player if not exists
      if (!playerRef.current && containerRef.current && window.YT && window.YT.Player) {
        playerRef.current = new window.YT.Player(containerRef.current, {
          videoId,
          playerVars: {
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            // NOTE: don't force autoplay here (mobile blocks). User taps to load embed already.
          },
          events: {
            onReady: ev => {
              try {
                ev.target.setPlaybackQuality(onReadyQuality);
              } catch {}
            },
          },
        });
      } else if (playerRef.current) {
        try {
          playerRef.current.loadVideoById({ videoId, suggestedQuality: onReadyQuality });
        } catch {}
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [videoId, onReadyQuality]);

  return <div ref={containerRef} className={className} />;
}

/* ---------- stations (kept to those that usually work) ---------- */
const STATIONS = [
  { name: 'Al-Muaiqly', url: 'https://qurango.net/radio/maher_almuaiqly', tag: 'Recitation' },
  { name: 'Al-Ajmy', url: 'https://qurango.net/radio/ahmad_alajmy', tag: 'Recitation' },
  { name: 'Sudais', url: 'https://qurango.net/radio/abdulrahman_alsudaes', tag: 'Recitation' },
  { name: 'Yasser Al-Dosari', url: 'https://qurango.net/radio/yasser_aldosari', tag: 'Recitation' },
];

/* ---------- ALL podcasts (unchanged; nothing removed) ---------- */
const PODCAST_SEED = ['https://www.youtube.com/watch?v=kEEpRIMK6Y0&t=1597s', 'https://www.youtube.com/watch?v=_v05Yc7AdOQ', 'https://www.youtube.com/watch?v=-W6ijtUgXiU', 'https://www.youtube.com/watch?v=agFMbV32JIc&t=1516s', 'https://www.youtube.com/watch?v=_85D3CqkoxA', 'https://www.youtube.com/watch?v=DdxrQV_bkkY', 'https://www.youtube.com/watch?v=f8croUJLd3Y&t=152s&pp=0gcJCeAJAYcqIYzv', 'https://www.youtube.com/watch?v=c6cJ9bbEQa0', 'https://www.youtube.com/watch?v=2faCQ0oQCG4', 'https://www.youtube.com/watch?v=63_AOCldyXo&t=3036s', 'https://www.youtube.com/watch?v=nkil1U1GxdA', 'https://www.youtube.com/watch?v=zaA_bsanOWw', 'https://www.youtube.com/watch?v=RvZLqmV9_SI&t=309s&pp=0gcJCeAJAYcqIYzv', 'https://www.youtube.com/watch?v=yiDqY3YB9RU', 'https://www.youtube.com/watch?v=5F6sCVhg0uc', 'https://www.youtube.com/watch?v=b8O3yLCbwTg', 'https://www.youtube.com/watch?v=bGW1NecvGGc', 'https://www.youtube.com/watch?v=PEu6zGl7qN4', 'https://www.youtube.com/watch?v=dxYI6cluroI', 'https://www.youtube.com/watch?v=y2ShgKJn1NA', 'https://www.youtube.com/watch?v=RFRLVUb2GUM'];

export const AudioHubInline = React.memo(function AudioHubInline({ open, onClose, alerting, hidden, setHidden }) {
  const audioRef = useRef(null);
  const wasPlayingBeforeAlert = useRef(false);
  const watchdogRef = useRef(null);

  // compact state via useLS
  const [tab, setTab] = useLS('audio.tab', 'stations');
  const [currentStationUrl, setCurrentStationUrl] = useLS('audio.station', STATIONS[0]?.url || '');
  const [volume, setVolume] = useLS('audio.volume', 0.9);
  const [muted, setMuted] = useLS('audio.muted', false);

  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // podcasts
  const [podcastsLoading, setPodcastsLoading] = useState(true);
  const [podcastList, setPodcastList] = useState([]);
  const [currentPodcastIdx, setCurrentPodcastIdx] = useState(0);
  const [userWantsEmbed, setUserWantsEmbed] = useState(false); // important for mobile data / saver

  // detect connection for hints/behavior
  const [netHint, setNetHint] = useState(null);
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.connection) {
      const { saveData, effectiveType } = navigator.connection;
      if (saveData || (effectiveType && /2g|3g/.test(effectiveType))) {
        setNetHint({ saveData: !!saveData, effectiveType });
      }
    }
  }, []);

  // init podcasts (with minimal delay to show skeleton)
  useEffect(() => {
    setPodcastsLoading(true);
    const t = setTimeout(() => {
      setPodcastList(normalizeYouTube(PODCAST_SEED));
      setPodcastsLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, []);

  // apply volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : Number(volume || 0);
  }, [volume, muted]);

  // stop audio when closing
  useEffect(() => {
    if (!open && audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {}
      setPlaying(false);
      setLoading(false);
      setErrorMsg(null);
    }
  }, [open]);

  // pause/resume on alerting
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (alerting) {
      wasPlayingBeforeAlert.current = playing;
      try {
        el.pause();
      } catch {}
      setPlaying(false);
    } else if (wasPlayingBeforeAlert.current) {
      (async () => {
        try {
          setLoading(true);
          await el.play();
          setPlaying(true);
        } catch {
          setPlaying(false);
        } finally {
          setLoading(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerting]);

  const clearWatchdog = () => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  };
  const armWatchdog = () => {
    clearWatchdog();
    watchdogRef.current = setTimeout(() => {
      setLoading(false);
      setErrorMsg('Taking too long to buffer. Try again or switch station.');
    }, 8000);
  };

  // audio event handlers (short + via props)
  const onLoadStart = () => {
    setErrorMsg(null);
    setLoading(true);
    armWatchdog();
  };
  const onWaiting = () => {
    setLoading(true);
    armWatchdog();
  };
  const onStalled = () => {
    setLoading(true);
    armWatchdog();
  };
  const onCanPlay = () => {
    clearWatchdog();
    setLoading(false);
  };
  const onCanPlayThrough = () => {
    clearWatchdog();
    setLoading(false);
  };
  const onLoadedData = () => {
    clearWatchdog();
    setLoading(false);
  };
  const onPlaying = () => {
    clearWatchdog();
    setLoading(false);
    setPlaying(true);
  };
  const onPause = () => {
    clearWatchdog();
    setPlaying(false);
    setLoading(false);
  };
  const onEnded = () => {
    clearWatchdog();
    setPlaying(false);
    setLoading(false);
  };
  const onError = () => {
    clearWatchdog();
    setLoading(false);
    setPlaying(false);
    setErrorMsg('Stream error. Try another station.');
  };

  // HARD STOP then RESTART when switching station
  const chooseStation = async url => {
    setErrorMsg(null);
    const el = audioRef.current;
    if (!el) return;

    try {
      el.pause();
    } catch {}
    // hard stop old stream
    try {
      el.src = ''; // drop previous connection
      el.load(); // commit drop
    } catch {}

    setPlaying(false);
    setLoading(true);

    // persist state for UI/LS
    setCurrentStationUrl(url);

    // now attach new src and start
    try {
      el.src = url;
      el.load();
      await el.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
      setErrorMsg('Autoplay blocked or stream busy. Tap Play.');
    } finally {
      setLoading(false);
      clearWatchdog();
    }
  };

  const togglePlay = async () => {
    const el = audioRef.current;
    if (!el) return;
    setErrorMsg(null);

    if (playing) {
      try {
        el.pause();
      } catch {}
      setPlaying(false);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      await el.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
      setErrorMsg('Autoplay blocked. Tap Play again.');
    } finally {
      setLoading(false);
      clearWatchdog();
    }
  };

  if (!open) return null;
  const activeStation = STATIONS.find(s => s.url === currentStationUrl);
  const currentPodcast = podcastList[currentPodcastIdx];

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className={`w-full ${hidden && 'hidden'}`}>
        <div className='mt-2 -mb-2 pb-2 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden'>
          {/* Header */}
          <div className='px-3 py-2 flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white'>
            <div className='flex items-center gap-2 font-semibold text-sm text-slate-800'>
              <Headphones size={16} className={`transition ${playing ? 'text-emerald-600 animate-pulse' : 'text-indigo-600'}`} />
              <span>Audio</span>
              {playing && (
                <span className='ml-1 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700'>
                  <Activity size={12} className='animate-pulse' /> Live
                </span>
              )}
              {alerting && (
                <span className='ml-2 inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700'>
                  <Pause size={12} /> Alert active
                </span>
              )}
            </div>

            <div className='flex items-center gap-1'>
              <button onClick={() => setHidden(h => !h)} className='p-1.5 rounded-lg hover:bg-slate-100' title={hidden ? 'Show panel' : 'Hide panel (keep playing)'} aria-label={hidden ? 'Show panel' : 'Hide panel'}>
                {hidden ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button
                onClick={() => {
                  try {
                    audioRef.current?.pause();
                  } catch {}
                  setPlaying(false);
                  onClose?.();
                }}
                className='p-1.5 rounded-lg hover:bg-slate-100'
                aria-label='Close'
                title='Close'>
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className='px-3 pt-2'>
            <div className='inline-flex rounded-lg bg-slate-100 p-1'>
              {[
                { key: 'stations', label: 'Stations' },
                { key: 'podcasts', label: 'Podcasts' },
              ].map(t => {
                const active = tab === t.key;
                return (
                  <button key={t.key} onClick={() => setTab(t.key)} className={`relative px-2.5 py-1 text-xs rounded-md transition flex items-center ${active ? 'text-indigo-700' : 'text-slate-600 hover:text-slate-800'}`} aria-pressed={active}>
                    {t.label}
                    {active && <motion.span layoutId='audTab' className='absolute inset-0 -z-10 rounded-md bg-white shadow' transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stations */}
          {tab === 'stations' && (
            <div className='p-3 pb-0 space-y-2'>
              <div className='rounded-xl overflow-hidden border border-indigo-100'>
                <div className='bg-gradient-to-br from-indigo-50 via-white to-indigo-50/60 p-3'>
                  <div className='mb-2 flex items-center justify-between'>
                    <div className='text-sm font-semibold text-slate-800'>Qur’an Stations</div>
                    <div className='flex items-center gap-1 text-[11px] text-slate-600'>
                      <span className='inline-flex items-center gap-1'>
                        <Headphones size={12} /> {playing ? 'Playing' : 'Idle'}
                      </span>
                      <span>•</span>
                      <span className='inline-flex items-center gap-1'>
                        {muted ? <VolumeX size={12} /> : <Volume2 size={12} />} {muted ? 'Muted' : `${Math.round((Number(volume) || 0) * 100)}%`}
                      </span>
                    </div>
                  </div>

                  <div className='grid grid-cols-3 md:grid-cols-5 gap-1.5'>
                    {STATIONS.map(s => {
                      const active = currentStationUrl === s.url;
                      return (
                        <button key={s.url} onClick={() => chooseStation(s.url)} className={`relative text-left p-2 rounded-lg border transition group ${active ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-100' : 'bg-white border-slate-200 hover:bg-slate-50'}`} title={s.name}>
                          {active && (
                            <span className='absolute right-2 top-2 inline-flex items-center gap-1 text-[10px] text-indigo-700'>
                              <Radio size={12} className='text-indigo-600' /> Live
                            </span>
                          )}
                          <div className='text-xs font-medium truncate flex items-center gap-1 pr-8'>{s.name}</div>
                          <div className='text-[10px] text-slate-500 truncate'>{s.tag || 'Station'}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className='flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-2'>
                <div className='max-md:hidden text-[11px] flex items-center gap-2 min-w-0'>
                  <span className='font-medium shrink-0'>Now:</span>
                  <div className='relative w-full overflow-hidden'>
                    <div className='whitespace-nowrap animate-[marquee_10s_linear_infinite]'>{activeStation?.name || 'Station'}</div>
                  </div>
                  <div className='flex items-end gap-[2px] h-3 w-3 ml-1' aria-hidden>
                    {[0, 1, 2].map(i => (
                      <span key={i} className={`w-[2px] ${playing ? 'bg-emerald-600' : 'bg-slate-300'} ${playing ? 'animate-[bounce_0.6s_ease-in-out_infinite]' : ''}`} style={{ height: playing ? (i === 1 ? '12px' : '8px') : '2px', animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </div>
                </div>

                <div className='flex items-center gap-1.5 max-md:justify-end max-md:w-full '>
                  <button onClick={togglePlay} className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs min-w-[92px] justify-center ${loading ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-slate-200 hover:bg-slate-50'}`} aria-busy={loading ? 'true' : 'false'} aria-label={loading ? 'Loading' : playing ? 'Pause' : 'Play'}>
                    {loading ? (
                      <motion.span className='inline-block h-3 w-3 rounded-full border border-slate-400 border-t-transparent' animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} />
                    ) : playing ? (
                      <>
                        <Pause size={12} /> Pause
                      </>
                    ) : (
                      <>
                        <Play size={12} /> Play
                      </>
                    )}
                  </button>

                  <button onClick={() => setMuted(m => !m)} className='inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs border-slate-200 hover:bg-slate-50' aria-label={muted ? 'Unmute' : 'Mute'}>
                    {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  </button>

                  <input type='range' min='0' max='1' step='0.01' value={muted ? 0 : Number(volume) || 0} onChange={e => setVolume(Number(e.target.value))} className='w-20 accent-indigo-600' title='Volume' />
                </div>
              </div> 
            </div>
          )}

          {/* Podcasts */}
          {tab === 'podcasts' && (
            <div className='space-y-2 p-3 pt-2'>
              {/* connection hint */}
              {netHint && <div className='text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-2'>{netHint.saveData ? 'Data Saver is on.' : 'Mobile data detected.'} Tap a thumbnail to load the video player. You can also open in YouTube.</div>}

              {podcastsLoading ? (
                <>
                  <div className='aspect-video w-[calc(100%+40px)] max-md:-mt-2 -ml-[20px] md:w-[calc(100%+20px)] md:-ml-[10px] rounded-lg overflow-hidden border border-slate-200'>
                    <div className='h-full w-full animate-pulse bg-slate-100' />
                  </div>
                  <div className='flex gap-1.5 pb-1'>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className='min-w-[60px] max-w-[60px] rounded-md border border-slate-200 overflow-hidden'>
                        <div className='h-[45px] w-full animate-pulse bg-slate-100' />
                      </div>
                    ))}
                  </div>
                </>
              ) : podcastList.length > 0 ? (
                <>
                  <div className='aspect-video w-[calc(100%+40px)] max-md:-mt-2 -ml-[20px] md:w-[calc(100%+20px)] md:-ml-[10px] rounded-lg overflow-hidden border border-slate-200 relative'>
                    {/* click-to-load layer for data saver / mobile data */}
                    {!userWantsEmbed ? (
                      <button onClick={() => setUserWantsEmbed(true)} className='absolute inset-0 z-10 grid place-items-center bg-black/30 text-white text-xs' title='Tap to load video'>
                        Tap to load video
                      </button>
                    ) : null}

                    {userWantsEmbed ? <YouTubePlayer videoId={currentPodcast.id} onReadyQuality='hd720' className='w-full h-full' /> : <img src={currentPodcast.thumb} alt='' className='w-full h-full object-cover' />}

                    {/* open in youtube fallback */}
                    <a href={currentPodcast.url} target='_blank' rel='noopener noreferrer' className='absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-[11px] border border-slate-200 hover:bg-white' title='Open in YouTube'>
                      <ExternalLink size={12} /> Open in YouTube
                    </a>
                  </div>

                  <div className='flex gap-1.5 overflow-x-auto pb-1'>
                    {podcastList.map((p, i) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setCurrentPodcastIdx(i);
                          // keep userWantsEmbed state; user decides to load the player
                        }}
                        className={`min-w-[60px] max-w-[60px] rounded-md border overflow-hidden text-left ${i === currentPodcastIdx ? 'border-indigo-300' : 'border-slate-200 hover:border-slate-300'}`}
                        title={p.title}
                        aria-pressed={i === currentPodcastIdx}>
                        <img src={p.thumb} alt='' className='w-full h-full object-cover' />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className='text-xs text-slate-500'>No YouTube links yet.</div>
              )}
            </div>
          )}

          {/* keep audio mounted */}
          <audio ref={audioRef} src={currentStationUrl} preload='none' crossOrigin='anonymous' onLoadStart={onLoadStart} onWaiting={onWaiting} onStalled={onStalled} onCanPlay={onCanPlay} onCanPlayThrough={onCanPlayThrough} onLoadedData={onLoadedData} onPlaying={onPlaying} onPause={onPause} onEnded={onEnded} onError={onError} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
});
