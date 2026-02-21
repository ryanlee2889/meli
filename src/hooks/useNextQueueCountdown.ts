import { useEffect, useState } from 'react';

function getNextQueueTime(): Date {
  const now = new Date();
  const next = new Date(now);
  next.setHours(10, 0, 0, 0);
  if (now >= next) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function useNextQueueCountdown(): string {
  const [countdown, setCountdown] = useState(() =>
    formatCountdown(getNextQueueTime().getTime() - Date.now())
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(formatCountdown(getNextQueueTime().getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return countdown;
}
