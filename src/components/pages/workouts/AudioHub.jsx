'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Pause,
  Play,
  Radio,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  X,
  ExternalLink,
  Headphones,
  Search,
  Loader2,
  Music2,
  Mic2,
  RefreshCw,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

/* ─────────────────────────────────────────
   UTILITIES
───────────────────────────────────────── */
const cx = (...a) => a.filter(Boolean).join(' ');

function useLS(key, initialValue) {
  const [val, setVal] = useState(initialValue);
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = window.localStorage.getItem(key);
        if (stored !== null) setVal(JSON.parse(stored));
      }
    } catch {}
  }, [key]);
  useEffect(() => {
    try {
      if (typeof window !== 'undefined')
        window.localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }, [key, val]);
  return [val, setVal];
}

/* ─────────────────────────────────────────
   YOUTUBE HELPERS
───────────────────────────────────────── */
const getYouTubeId = u => {
  try {
    const url = new URL(u);
    if (url.hostname.includes('youtube.com')) return url.searchParams.get('v');
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1);
  } catch {}
  return null;
};

const normalizeYouTube = (arr, t) =>
  (arr || []).map((item, idx) => {
    const id = getYouTubeId(item) || `yt_${idx}`;
    return {
      id,
      url: item,
      title: t('podcastTitle', { n: idx + 1 }),
      embed: id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1` : '',
      thumb: id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '',
    };
  });

let YT_API_LOADING = false;
let YT_API_READY = false;
const ensureYTApi = () =>
  new Promise(resolve => {
    if (YT_API_READY && window.YT?.Player) return resolve(true);
    if (YT_API_LOADING) {
      const check = setInterval(() => {
        if (YT_API_READY && window.YT?.Player) { clearInterval(check); resolve(true); }
      }, 50);
      return;
    }
    YT_API_LOADING = true;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    window.onYouTubeIframeAPIReady = () => { YT_API_READY = true; resolve(true); };
    document.head.appendChild(tag);
  });

function YouTubePlayer({ videoId, className }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureYTApi();
      if (cancelled) return;
      if (!playerRef.current && containerRef.current && window.YT?.Player) {
        playerRef.current = new window.YT.Player(containerRef.current, {
          videoId,
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
          events: { onReady: ev => { try { ev.target.setPlaybackQuality('hd720'); } catch {} } },
        });
      } else if (playerRef.current) {
        try { playerRef.current.loadVideoById({ videoId, suggestedQuality: 'hd720' }); } catch {}
      }
    })();
    return () => { cancelled = true; };
  }, [videoId]);
  return <div ref={containerRef} className={className} />;
}

/* ─────────────────────────────────────────
   DATA
───────────────────────────────────────── */
const STATIONS = [
  { name: 'المعيقلي', nameEn: 'Al-Muaiqly', url: 'https://qurango.net/radio/maher_almuaiqly', tag: 'تلاوة' },
  { name: 'الأحمد', nameEn: 'Al-Ajmy', url: 'https://qurango.net/radio/ahmad_alajmy', tag: 'تلاوة' },
  { name: 'السديس', nameEn: 'Sudais', url: 'https://qurango.net/radio/abdulrahman_alsudaes', tag: 'تلاوة' },
  { name: 'ياسر الدوسري', nameEn: 'Yasser Al-Dosari', url: 'https://qurango.net/radio/yasser_aldosari', tag: 'تلاوة' },
];

const PODCAST_SEED = [
  'https://www.youtube.com/watch?v=kEEpRIMK6Y0&t=1597s',
  'https://www.youtube.com/watch?v=_v05Yc7AdOQ',
  'https://www.youtube.com/watch?v=-W6ijtUgXiU',
  'https://www.youtube.com/watch?v=agFMbV32JIc&t=1516s',
  'https://www.youtube.com/watch?v=_85D3CqkoxA',
  'https://www.youtube.com/watch?v=DdxrQV_bkkY',
  'https://www.youtube.com/watch?v=f8croUJLd3Y&t=152s',
  'https://www.youtube.com/watch?v=c6cJ9bbEQa0',
  'https://www.youtube.com/watch?v=2faCQ0oQCG4',
  'https://www.youtube.com/watch?v=63_AOCldyXo&t=3036s',
  'https://www.youtube.com/watch?v=nkil1U1GxdA',
  'https://www.youtube.com/watch?v=zaA_bsanOWw',
  'https://www.youtube.com/watch?v=RvZLqmV9_SI&t=309s',
  'https://www.youtube.com/watch?v=yiDqY3YB9RU',
  'https://www.youtube.com/watch?v=5F6sCVhg0uc',
  'https://www.youtube.com/watch?v=b8O3yLCbwTg',
  'https://www.youtube.com/watch?v=bGW1NecvGGc',
  'https://www.youtube.com/watch?v=PEu6zGl7qN4',
  'https://www.youtube.com/watch?v=dxYI6cluroI',
  'https://www.youtube.com/watch?v=y2ShgKJn1NA',
  'https://www.youtube.com/watch?v=RFRLVUb2GUM',
];

/* ─────────────────────────────────────────
   AUDIO ENGINE — fixes the cutting issue
   
   Root cause: live radio streams are HLS/infinite streams.
   After ~60–90s the browser's media buffer fills up.
   The element stalls, tries to seek, and cuts out.
   
   Fix strategy:
   1. Set audio.preload = 'none' — don't buffer ahead
   2. Watchdog: if stalled/waiting for > 4s, reload and resume
   3. On stall/waiting, attempt el.load() + el.play() immediately
   4. Never let the buffer grow: periodically trim if currentTime > 30s
   5. Use crossOrigin='anonymous' for CORS streams
───────────────────────────────────────── */
const WATCHDOG_MS = 4500;   // restart if silent for 4.5s
const REBUFFER_DELAY = 600; // wait before retrying
const MAX_RETRIES = 4;

function useAudioEngine({ onPlayStateChange, onLoadingChange, onError }) {
  const audioRef = useRef(null);
  const watchdogRef = useRef(null);
  const switchingRef = useRef(false);
  const currentUrlRef = useRef('');
  const retriesRef = useRef(0);
  const wasPlayingRef = useRef(false);
  const trimIntervalRef = useRef(null);

  // ── buffer trimmer — keeps live stream buffer short ──
  const startBufferTrimmer = useCallback(() => {
    if (trimIntervalRef.current) return;
    trimIntervalRef.current = setInterval(() => {
      const el = audioRef.current;
      if (!el || el.paused) return;
      // For live streams, currentTime drifts. Periodically nudge to live edge.
      if (el.seekable && el.seekable.length > 0) {
        const liveEdge = el.seekable.end(el.seekable.length - 1);
        const diff = liveEdge - el.currentTime;
        // If we're more than 8s behind live edge, seek forward
        if (diff > 8) {
          try { el.currentTime = liveEdge - 0.5; } catch {}
        }
      }
    }, 5000);
  }, []);

  const stopBufferTrimmer = useCallback(() => {
    if (trimIntervalRef.current) { clearInterval(trimIntervalRef.current); trimIntervalRef.current = null; }
  }, []);

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; }
  }, []);

  const armWatchdog = useCallback(() => {
    clearWatchdog();
    watchdogRef.current = setTimeout(async () => {
      const el = audioRef.current;
      if (!el || !wasPlayingRef.current) return;
      if (retriesRef.current >= MAX_RETRIES) {
        onError?.('stream-dead');
        retriesRef.current = 0;
        return;
      }
      retriesRef.current += 1;
      onLoadingChange?.(true);
      // Hard reload the stream
      const url = currentUrlRef.current;
      try {
        el.pause();
        el.removeAttribute('src');
        el.load();
        await new Promise(r => setTimeout(r, REBUFFER_DELAY));
        const bust = `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`;
        el.src = bust;
        el.load();
        await new Promise(r => setTimeout(r, 400));
        await el.play();
        retriesRef.current = 0;
        onLoadingChange?.(false);
        onPlayStateChange?.(true);
      } catch {
        onLoadingChange?.(false);
        armWatchdog(); // retry again
      }
    }, WATCHDOG_MS);
  }, [clearWatchdog, onError, onLoadingChange, onPlayStateChange]);

  const loadAndPlay = useCallback(async (url, { autoplay = true } = {}) => {
    const el = audioRef.current;
    if (!el || switchingRef.current) return;
    switchingRef.current = true;
    retriesRef.current = 0;
    wasPlayingRef.current = false;
    currentUrlRef.current = url;

    onError?.(null);
    onLoadingChange?.(true);
    onPlayStateChange?.(false);
    stopBufferTrimmer();
    clearWatchdog();

    try {
      el.pause();
      el.removeAttribute('src');
      el.load();
      await new Promise(r => setTimeout(r, 80));

      el.preload = 'none';
      el.src = url;
      el.load();

      if (autoplay) {
        await new Promise(r => setTimeout(r, 200));
        try {
          await el.play();
          wasPlayingRef.current = true;
          onPlayStateChange?.(true);
          startBufferTrimmer();
          armWatchdog();
        } catch {
          onPlayStateChange?.(false);
        }
      }
    } catch {
      onPlayStateChange?.(false);
      onError?.('load-failed');
    } finally {
      onLoadingChange?.(false);
      switchingRef.current = false;
    }
  }, [clearWatchdog, armWatchdog, startBufferTrimmer, stopBufferTrimmer, onError, onLoadingChange, onPlayStateChange]);

  const togglePlay = useCallback(async () => {
    const el = audioRef.current;
    if (!el) return;
    onError?.(null);

    if (!el.paused) {
      el.pause();
      wasPlayingRef.current = false;
      clearWatchdog();
      stopBufferTrimmer();
      onPlayStateChange?.(false);
      return;
    }

    if (!el.src || el.src === window.location.href) {
      await loadAndPlay(currentUrlRef.current, { autoplay: true });
      return;
    }

    onLoadingChange?.(true);
    try {
      if (el.readyState < 2) {
        el.load();
        await new Promise(r => setTimeout(r, 300));
      }
      await el.play();
      wasPlayingRef.current = true;
      onPlayStateChange?.(true);
      startBufferTrimmer();
      armWatchdog();
    } catch {
      // Src might be stale — reload
      await loadAndPlay(currentUrlRef.current, { autoplay: true });
    } finally {
      onLoadingChange?.(false);
    }
  }, [clearWatchdog, armWatchdog, startBufferTrimmer, stopBufferTrimmer, loadAndPlay, onError, onLoadingChange, onPlayStateChange]);

  const stopAll = useCallback(() => {
    const el = audioRef.current;
    clearWatchdog();
    stopBufferTrimmer();
    wasPlayingRef.current = false;
    if (el) { try { el.pause(); el.removeAttribute('src'); el.load(); } catch {} }
    onPlayStateChange?.(false);
    onLoadingChange?.(false);
  }, [clearWatchdog, stopBufferTrimmer, onPlayStateChange, onLoadingChange]);

  // Audio element event handlers
  const handlers = {
    onLoadStart: () => { clearWatchdog(); onLoadingChange?.(true); },
    onWaiting: () => { onLoadingChange?.(true); if (wasPlayingRef.current) armWatchdog(); },
    onStalled: () => { onLoadingChange?.(true); if (wasPlayingRef.current) armWatchdog(); },
    onCanPlay: () => { clearWatchdog(); onLoadingChange?.(false); },
    onCanPlayThrough: () => { clearWatchdog(); onLoadingChange?.(false); },
    onPlaying: () => {
      clearWatchdog();
      onLoadingChange?.(false);
      onPlayStateChange?.(true);
      wasPlayingRef.current = true;
      startBufferTrimmer();
      armWatchdog(); // keep re-arming while playing
    },
    onPause: () => {
      clearWatchdog();
      onPlayStateChange?.(false);
      onLoadingChange?.(false);
      stopBufferTrimmer();
    },
    onEnded: () => { clearWatchdog(); onPlayStateChange?.(false); onLoadingChange?.(false); stopBufferTrimmer(); },
    onError: () => {
      clearWatchdog();
      onLoadingChange?.(false);
      onPlayStateChange?.(false);
      stopBufferTrimmer();
      if (wasPlayingRef.current && retriesRef.current < MAX_RETRIES) {
        retriesRef.current += 1;
        setTimeout(() => loadAndPlay(currentUrlRef.current, { autoplay: true }), 1200);
      } else {
        onError?.('stream-error');
      }
    },
  };

  useEffect(() => () => { clearWatchdog(); stopBufferTrimmer(); }, [clearWatchdog, stopBufferTrimmer]);

  return { audioRef, loadAndPlay, togglePlay, stopAll, handlers, currentUrlRef };
}

/* ─────────────────────────────────────────
   WAVEFORM ANIMATION
───────────────────────────────────────── */
function Waveform({ active, bars = 24, className = '' }) {
  return (
    <div className={cx('flex items-end gap-[2px]', className)} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => {
        const base = 3 + ((i * 17 + 7) % 14);
        return (
          <span
            key={i}
            className={cx(
              'flex-1 rounded-full transition-all',
              active ? 'bg-[var(--color-primary-400)]' : 'bg-[var(--color-primary-200)]',
            )}
            style={{
              height: `${base}px`,
              animation: active ? `wave ${0.8 + (i % 5) * 0.15}s ease-in-out ${(i % 7) * 0.07}s infinite alternate` : 'none',
            }}
          />
        );
      })}
      <style>{`
        @keyframes wave {
          from { height: ${3}px; }
          to { height: ${20}px; }
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────
   PLAY BUTTON
───────────────────────────────────────── */
function PlayBtn({ playing, loading, onClick, size = 'md' }) {
  const sizeMap = { sm: 'w-9 h-9', md: 'w-12 h-12', lg: 'w-14 h-14' };
  const iconSize = { sm: 14, md: 18, lg: 20 };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cx(
        sizeMap[size],
        'rounded-full flex items-center justify-center transition-all active:scale-90',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-300)]',
        playing
          ? 'bg-white border-2 border-[var(--color-primary-300)] text-[var(--color-primary-600)] shadow-md'
          : 'bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white shadow-lg shadow-[var(--color-primary-200)]',
        loading && 'opacity-80',
      )}
      aria-label={loading ? 'Loading...' : playing ? 'Pause' : 'Play'}
    >
      {loading
        ? <Loader2 size={iconSize[size]} className="animate-spin" />
        : playing
        ? <Pause size={iconSize[size]} fill="currentColor" />
        : <Play size={iconSize[size]} fill="currentColor" className="translate-x-0.5" />
      }
    </button>
  );
}

/* ─────────────────────────────────────────
   STATION CARD
───────────────────────────────────────── */
function StationCard({ station, isActive, isPlaying, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(station.url)}
      className={cx(
        'w-full text-left rounded-lg border p-3 transition-all duration-150 active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-300)]',
        isActive
          ? 'border-[var(--color-primary-300)] bg-[var(--color-primary-50)]'
          : 'border-slate-200 bg-white hover:border-[var(--color-primary-200)] hover:bg-[var(--color-primary-50)]/60',
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cx(
          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all',
          isActive
            ? 'bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] shadow-sm'
            : 'bg-[var(--color-primary-50)] border border-[var(--color-primary-100)]',
        )}>
          <Radio size={15} className={isActive ? 'text-white' : 'text-[var(--color-primary-500)]'} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cx('text-sm font-semibold truncate', isActive ? 'text-[var(--color-primary-700)]' : 'text-slate-800')}>
            {station.name}
          </p>
          <p className="text-[11px] text-slate-400 truncate">{station.nameEn}</p>
        </div>
        {isActive && (
          <div className="shrink-0">
            {isPlaying
              ? <Waveform active bars={8} className="h-4 w-10" />
              : <span className="text-[10px] font-semibold text-[var(--color-primary-500)] bg-[var(--color-primary-100)] rounded-lg px-2 py-0.5">جاهز</span>
            }
          </div>
        )}
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────
   NOW PLAYING PANEL
───────────────────────────────────────── */
function NowPlayingPanel({ station, playing, loading, error, volume, muted, onToggle, onMute, onVolumeChange, onRetry, t }) {
  return (
    <div className="rounded-lg border border-[var(--color-primary-100)] bg-gradient-to-br from-[var(--color-primary-50)] via-white to-white overflow-hidden">
      {/* Station display */}
      <div className="px-4 pt-5 pb-4 text-center">
        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[var(--color-primary-200)]">
          <Headphones size={26} className="text-white" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-primary-400)] mb-1">
          {playing ? t('states.live') : t('nowPlaying')}
        </p>
        <h3 className="text-base font-black text-slate-800 truncate px-4">
          {station?.name || t('stationFallback')}
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">{station?.nameEn}</p>
      </div>

      {/* Waveform */}
      <div className="px-6 pb-4">
        <Waveform active={playing && !loading} bars={32} className="h-8" />
      </div>

      {/* Controls */}
      <div className="px-4 pb-4 flex items-center justify-center gap-4">
        <button
          onClick={onMute}
          className={cx(
            'w-10 h-10 rounded-lg flex items-center justify-center border transition-all active:scale-90',
            muted ? 'border-rose-200 bg-rose-50 text-rose-500' : 'border-[var(--color-primary-200)] bg-white text-[var(--color-primary-600)] hover:bg-[var(--color-primary-50)]',
          )}
          aria-label={muted ? t('actions.unmute') : t('actions.mute')}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        <PlayBtn playing={playing} loading={loading} onClick={onToggle} size="lg" />

        <button
          onClick={onRetry}
          className="w-10 h-10 rounded-lg flex items-center justify-center border border-[var(--color-primary-200)] bg-white text-[var(--color-primary-500)] hover:bg-[var(--color-primary-50)] transition-all active:scale-90"
          aria-label={t('actions.retry')}
          title={t('actions.retry')}
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Volume */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-3">
          <VolumeX size={13} className="text-slate-300 shrink-0" />
          <input dir='ltr'
            type="range" min="0" max="1" step="0.02"
            value={muted ? 0 : Number(volume) || 0}
            onChange={e => onVolumeChange(Number(e.target.value))}
            className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-[var(--color-primary-500)]"
            style={{ background: `linear-gradient(to right, var(--color-primary-500) ${(muted ? 0 : Number(volume) || 0) * 100}%, #e2e8f0 0)` }}
            aria-label={t('volume')}
          />
          <Volume2 size={13} className="text-[var(--color-primary-400)] shrink-0" />
          <span className="text-[11px] text-slate-400 tabular-nums w-8 text-right">
            {Math.round((muted ? 0 : Number(volume) || 0) * 100)}%
          </span>
        </div>
      </div>
 
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export const AudioHubInline = React.memo(function AudioHubInline({
  open, onClose, alerting, hidden, setHidden,
}) {
  const t = useTranslations('audioHub');

  /* ── Persisted state ── */
  const [tab, setTab] = useLS('audio.tab', 'stations');
  const [currentStationUrl, setCurrentStationUrl] = useLS('audio.station', STATIONS[0]?.url || '');
  const [volume, setVolume] = useLS('audio.volume', 0.9);
  const [muted, setMuted] = useLS('audio.muted', false);

  /* ── Runtime state ── */
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [stationQuery, setStationQuery] = useState('');
  const [podcastList, setPodcastList] = useState([]);
  const [podcastsLoading, setPodcastsLoading] = useState(true);
  const [currentPodcastIdx, setCurrentPodcastIdx] = useState(0);
  const [userWantsEmbed, setUserWantsEmbed] = useState(false);

  const wasPlayingBeforeAlert = useRef(false);

  /* ── Audio engine ── */
  const { audioRef, loadAndPlay, togglePlay, stopAll, handlers, currentUrlRef } = useAudioEngine({
    onPlayStateChange: setPlaying,
    onLoadingChange: setLoading,
    onError: code => {
      if (code) setErrorMsg(code);
    },
  });

  /* ── Volume sync ── */
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : Number(volume || 0);
  }, [volume, muted, audioRef]);

  /* ── Alert pause/resume ── */
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (alerting) {
      wasPlayingBeforeAlert.current = playing;
      try { el.pause(); } catch {}
      setPlaying(false);
    } else if (wasPlayingBeforeAlert.current) {
      loadAndPlay(currentUrlRef.current, { autoplay: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerting]);

  /* ── Init on open ── */
  useEffect(() => {
    if (open) {
      currentUrlRef.current = currentStationUrl;
    } else {
      stopAll();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* ── Podcasts ── */
  useEffect(() => {
    setPodcastsLoading(true);
    const tt = setTimeout(() => {
      setPodcastList(normalizeYouTube(PODCAST_SEED, t));
      setPodcastsLoading(false);
    }, 250);
    return () => clearTimeout(tt);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Handlers ── */
  const chooseStation = useCallback(async url => {
    setCurrentStationUrl(url);
    setErrorMsg(null);
    await loadAndPlay(url, { autoplay: true });
  }, [loadAndPlay, setCurrentStationUrl]);

  const handleRetry = useCallback(() => {
    setErrorMsg(null);
    loadAndPlay(currentStationUrl, { autoplay: true });
  }, [loadAndPlay, currentStationUrl]);

  const handleClose = useCallback(() => {
    stopAll();
    onClose?.();
  }, [stopAll, onClose]);

  const filteredStations = useMemo(() => {
    const q = stationQuery.trim().toLowerCase();
    if (!q) return STATIONS;
    return STATIONS.filter(s => (s.name + ' ' + s.nameEn + ' ' + (s.tag || '')).toLowerCase().includes(q));
  }, [stationQuery]);

  const activeStation = STATIONS.find(s => s.url === currentStationUrl);
  const currentPodcast = podcastList[currentPodcastIdx];

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className={cx('w-full', hidden && 'hidden')}
      >
        <div className="rounded-lg border border-[var(--color-primary-100)] bg-white shadow-xl shadow-[var(--color-primary-100)]/50 overflow-hidden">

          {/* ── HEADER ── */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-primary-100)] bg-gradient-to-r from-[var(--color-primary-50)] to-white">
            <div className="flex items-center gap-2.5">
              <div className={cx(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                'bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)]',
              )}>
                <Headphones size={15} className="text-white" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-800">{t('audio')}</span>
                {playing && (
                  <span className="ms-2 inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--color-primary-600)] bg-[var(--color-primary-100)] rounded-full px-2 py-0.5">
                    <Activity size={10} className="animate-pulse" /> {t('live')}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setHidden(h => !h)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-[var(--color-primary-50)] transition-all active:scale-90"
                title={hidden ? t('actions.showPanelTitle') : t('actions.hidePanelTitle')}
              >
                {hidden ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-rose-50 hover:text-rose-400 transition-all active:scale-90"
                aria-label={t('actions.close')}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* ── TABS ── */}
          <div className="px-4 pt-3">
            <div className="flex gap-1 p-1 rounded-lg bg-[var(--color-primary-50)] border border-[var(--color-primary-100)]">
              {[
                { key: 'stations', label: t('tabs.stations'), icon: Radio },
                { key: 'podcasts', label: t('tabs.podcasts'), icon: Mic2 },
              ].map(tt => {
                const isActive = tab === tt.key;
                return (
                  <button
                    key={tt.key}
                    onClick={() => setTab(tt.key)}
                    className={cx(
                      'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700',
                    )}
                    aria-pressed={isActive}
                  >
                    <tt.icon size={13} />
                    {tt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── STATIONS TAB ── */}
          {tab === 'stations' && (
            <div className="p-4 space-y-4">
              {/* Now Playing */}
              <NowPlayingPanel
                station={activeStation}
                playing={playing}
                loading={loading}
                error={errorMsg}
                volume={volume}
                muted={muted}
                onToggle={togglePlay}
                onMute={() => setMuted(m => !m)}
                onVolumeChange={v => { setMuted(false); setVolume(v); }}
                onRetry={handleRetry}
                t={t}
              />

              {/* Station list */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">{t('quranStations')}</h4>
                  <span className="text-[11px] text-slate-400">{STATIONS.length} محطة</span>
                </div>
 

                <div className="space-y-2">
                  {filteredStations.length ? filteredStations.map(s => (
                    <StationCard
                      key={s.url}
                      station={s}
                      isActive={currentStationUrl === s.url}
                      isPlaying={currentStationUrl === s.url && playing}
                      onSelect={chooseStation}
                    />
                  )) : (
                    <div className="text-center py-6 text-xs text-slate-400">{t('noStationsMatch')}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── PODCASTS TAB ── */}
          {tab === 'podcasts' && (
            <div className="p-4 space-y-3">
              {/* Video player */}
              <div className="rounded-lg border border-[var(--color-primary-100)] overflow-hidden bg-black aspect-video relative">
                {podcastsLoading ? (
                  <div className="w-full h-full animate-pulse bg-slate-200 flex items-center justify-center">
                    <Music2 size={28} className="text-slate-300" />
                  </div>
                ) : currentPodcast ? (
                  <>
                    {!userWantsEmbed && (
                      <button
                        onClick={() => setUserWantsEmbed(true)}
                        className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/40 text-white"
                      >
                        <img src={currentPodcast.thumb} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                        <div className="relative z-10 w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
                          <Play size={22} fill="currentColor" className="text-[var(--color-primary-600)] translate-x-0.5" />
                        </div>
                        <span className="relative z-10 text-xs font-semibold bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
                          {t('tapToLoad')}
                        </span>
                      </button>
                    )}
                    {userWantsEmbed
                      ? <YouTubePlayer videoId={currentPodcast.id} className="w-full h-full" />
                      : <img src={currentPodcast.thumb} alt="" className="w-full h-full object-cover opacity-40" />
                    }
                    <a
                      href={currentPodcast.url}
                      target="_blank" rel="noopener noreferrer"
                      className="absolute bottom-2 end-2 z-20 inline-flex items-center gap-1.5 rounded-lg bg-black/70 backdrop-blur-sm text-white text-[11px] font-medium px-2.5 py-1.5 hover:bg-black/80 transition-all"
                    >
                      <ExternalLink size={11} /> {t('openInYouTube')}
                    </a>
                  </>
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-xs text-slate-400">{t('noYouTubeLinksYet')}</div>
                )}
              </div>

              {/* Podcast nav */}
              {!podcastsLoading && podcastList.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setCurrentPodcastIdx(i => Math.max(0, i - 1)); setUserWantsEmbed(false); }}
                    disabled={currentPodcastIdx === 0}
                    className="w-9 h-9 rounded-lg border border-[var(--color-primary-200)] flex items-center justify-center text-[var(--color-primary-600)] hover:bg-[var(--color-primary-50)] disabled:opacity-30 transition-all active:scale-90"
                  >
                    <ChevronLeft className='rtl:scale-x-[-1] ' size={16} />
                  </button>
                  <div className="flex-1 text-center">
                    <p className="text-xs font-semibold text-slate-700 truncate">{currentPodcast?.title}</p>
                    <p className="text-[11px] text-slate-400">{currentPodcastIdx + 1} / {podcastList.length}</p>
                  </div>
                  <button
                    onClick={() => { setCurrentPodcastIdx(i => Math.min(podcastList.length - 1, i + 1)); setUserWantsEmbed(false); }}
                    disabled={currentPodcastIdx === podcastList.length - 1}
                    className="w-9 h-9 rounded-lg border border-[var(--color-primary-200)] flex items-center justify-center text-[var(--color-primary-600)] hover:bg-[var(--color-primary-50)] disabled:opacity-30 transition-all active:scale-90"
                  >
                    <ChevronRight className='rtl:scale-x-[-1] ' size={16} />
                  </button>
                </div>
              )}

              {/* Playlist grid */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{t('playlist')}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto">
                  {podcastsLoading
                    ? Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="aspect-video rounded-lg bg-slate-100 animate-pulse" />
                    ))
                    : podcastList.map((p, i) => (
                      <button
                        key={p.id}
                        onClick={() => { setCurrentPodcastIdx(i); setUserWantsEmbed(false); }}
                        className={cx(
                          'relative aspect-video rounded-lg overflow-hidden border-2 transition-all active:scale-95',
                          i === currentPodcastIdx
                            ? 'border-[var(--color-primary-400)] ring-2 ring-[var(--color-primary-200)]'
                            : 'border-transparent hover:border-[var(--color-primary-200)]',
                        )}
                      >
                        <img src={p.thumb} alt="" className="w-full h-full object-cover" />
                        {i === currentPodcastIdx && (
                          <div className="absolute inset-0 bg-[var(--color-primary-600)]/30 flex items-center justify-center">
                            <Play size={16} fill="currentColor" className="text-white" />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1">
                          <p className="text-[9px] text-white font-medium truncate">{p.title}</p>
                        </div>
                      </button>
                    ))
                  }
                </div>
              </div>
            </div>
          )}

          {/* ── AUDIO ELEMENT ── */}
          <audio
            ref={audioRef}
            preload="none"
            crossOrigin="anonymous"
            {...handlers}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
});