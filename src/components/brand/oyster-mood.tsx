"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type OysterMood = "idle" | "closed" | "open";

const OysterMoodContext = createContext<{
  mood: OysterMood;
  setMood: (mood: OysterMood) => void;
}>({ mood: "idle", setMood: () => {} });

/** Local decoration state; shared password fields need no provider elsewhere. */
export function OysterMoodProvider({ children }: { children: ReactNode }) {
  const [mood, setMood] = useState<OysterMood>("idle");
  const value = useMemo(() => ({ mood, setMood }), [mood]);
  return <OysterMoodContext.Provider value={value}>{children}</OysterMoodContext.Provider>;
}

export function useOysterMood() {
  return useContext(OysterMoodContext);
}
