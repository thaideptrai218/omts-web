"use client";

import { useEffect, useState } from "react";

import { getRemainingSeconds } from "@/features/verification/lib/countdown";

export function useCountdown(targetMs: number): number | null {
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    function updateClock() {
      setNowMs(Date.now());
    }

    updateClock();
    const intervalId = window.setInterval(updateClock, 250);

    return () => window.clearInterval(intervalId);
  }, [targetMs]);

  return nowMs === null ? null : getRemainingSeconds(targetMs, nowMs);
}
