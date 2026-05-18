import { useState, useCallback, useRef } from 'react';

// Drives a refresh-spinner that runs for at least `minDurationMs` even if
// the underlying action resolves faster, so the icon always completes at
// least one full rotation. `tw-animate-spin` is 1s per rotation by default.
export default function useSpinAction(action, minDurationMs = 1000) {
  const [isSpinning, setIsSpinning] = useState(false);
  const inFlightRef = useRef(false);

  const trigger = useCallback(async (...args) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsSpinning(true);
    const start = Date.now();
    try {
      return await action(...args);
    } finally {
      const remaining = Math.max(0, minDurationMs - (Date.now() - start));
      setTimeout(() => {
        setIsSpinning(false);
        inFlightRef.current = false;
      }, remaining);
    }
  }, [action, minDurationMs]);

  return [isSpinning, trigger];
}
