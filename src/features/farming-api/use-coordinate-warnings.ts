"use client";
import { useOptionalToast } from "@/components/ui/toast-provider";
import { coordinateWarningTexts } from "./coordinate-warnings";

/** Returns a function that shows the non-blocking coordinate warnings of a saved zone or raft as warning toasts (nothing when there are none). */
export function useCoordinateWarnings() {
  const toast = useOptionalToast();
  return (saved: unknown) => { for (const title of coordinateWarningTexts(saved)) toast?.notify({ tone: "warning", title }); };
}
