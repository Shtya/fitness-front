import { useEffect, useRef, useState } from 'react';

export function useCountdown() {
  const [duration, setDuration] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => () => intervalRef.current && clearInterval(intervalRef.current), []);

  const start = seconds => {
    const sec = Math.max(0, Math.round(Number(seconds) || 0));
    setDuration(sec);
    setRemaining(sec);
    setRunning(true);
    setPaused(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  const pause = () => {
    if (!running) return;
    setPaused(true);
    clearInterval(intervalRef.current);
  };
  const resume = () => {
    if (!running || !paused) return;
    setPaused(false);
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  const stop = () => {
    setRunning(false);
    setPaused(false);
    clearInterval(intervalRef.current);
    setRemaining(0);
  };
  return { duration, remaining, running, paused, start, pause, resume, stop };
}
