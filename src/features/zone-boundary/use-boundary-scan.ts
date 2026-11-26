"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { workspaceError } from "@/features/api-workspace/workspace-error";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import type { ZoneMapReading } from "./boundary-contract";
import { boundaryErrorText, scanFailureText } from "./boundary-error-text";
import { zoneBoundaryRepository } from "./zone-boundary-repository";

export const POLL_INTERVAL_MS = 2_000;
/** The server keeps working on a scan for about this long; after it the client gives up and offers a retry. */
export const READ_LIMIT_MS = 120_000;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const UPLOAD_LIMIT_MS = 60_000;
const REQUEST_LIMIT_MS = 20_000;
/** Poll answers that fail for a moment (offline, 5xx) are tolerated this many times in a row. */
const MAX_POLL_FAILURES = 3;

export type ScanPhase = "idle" | "reading" | "failed";
/** `canRetry`: the failed read had a usable photo, so repeating it makes sense. */
export type BoundaryScanState = { phase: ScanPhase; error?: string; elapsedMs: number; canRetry: boolean };

type Failed = Exclude<WorkspaceResult<unknown>, { status: "success" }>;
const failureText = (result: Failed) => boundaryErrorText(result) ?? workspaceError(result);

/** Photo rules checked before upload: JPEG or PNG, at most 10 MB. */
export function photoProblem(file: File): string | undefined {
  if (!["image/jpeg", "image/png"].includes(file.type)) return "Chỉ nhận ảnh JPEG hoặc PNG.";
  if (file.size < 1 || file.size > MAX_PHOTO_BYTES) return "Ảnh không được lớn hơn 10 MB.";
}

/** Waits `ms`, or throws when the read is cancelled meanwhile. */
const pause = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal.aborted) { reject(new DOMException("aborted", "AbortError")); return; }
  const timer = setTimeout(() => { signal.removeEventListener("abort", onAbort); resolve(); }, ms);
  const onAbort = () => { clearTimeout(timer); reject(new DOMException("aborted", "AbortError")); };
  signal.addEventListener("abort", onAbort, { once: true });
});

/** A request signal that ends when the read is cancelled or after `ms`, so one hung request cannot stall the whole read. */
function bounded(parent: AbortSignal, ms: number) {
  const child = new AbortController(), stop = () => child.abort(), timer = setTimeout(stop, ms);
  parent.addEventListener("abort", stop, { once: true });
  return { signal: child.signal, done() { clearTimeout(timer); parent.removeEventListener("abort", stop); } };
}

/**
 * Reads a licence map photo on the server: upload, then ask every 2 s until it is Done or Failed, for at most 120 s. `zoneId` binds the read to a
 * zone; without it the read is zone-less (the create form). Leaving the screen or `cancel` stops the polling; a result that arrives after that
 * is dropped. `onReading` gets the reading once, and `retry` repeats the last photo.
 */
export function useBoundaryScan({ zoneId, onReading }: { zoneId?: string; onReading(reading: ZoneMapReading): void }) {
  const [state, setState] = useState<BoundaryScanState>({ phase: "idle", elapsedMs: 0, canRetry: false });
  const control = useRef<AbortController>(undefined), lastPhoto = useRef<File>(undefined), deliver = useRef(onReading);
  useEffect(() => { deliver.current = onReading; });
  useEffect(() => () => control.current?.abort(), []);

  const start = useCallback(async (photo: File) => {
    control.current?.abort();
    const problem = photoProblem(photo);
    if (problem) { setState({ phase: "failed", error: problem, elapsedMs: 0, canRetry: false }); return; }
    const own = new AbortController();
    control.current = own; lastPhoto.current = photo;
    const fail = (error: string) => { if (!own.signal.aborted) setState({ phase: "failed", error, elapsedMs: 0, canRetry: true }); };
    setState({ phase: "reading", elapsedMs: 0, canRetry: false });
    try {
      const upload = bounded(own.signal, UPLOAD_LIMIT_MS);
      const started = await zoneBoundaryRepository.startScan(photo, zoneId, upload.signal).finally(upload.done);
      if (own.signal.aborted) return;
      if (started.status !== "success") { fail(failureText(started)); return; }
      let failures = 0;
      for (let waited = 0; waited < READ_LIMIT_MS;) {
        await pause(POLL_INTERVAL_MS, own.signal);
        waited += POLL_INTERVAL_MS;
        setState({ phase: "reading", elapsedMs: waited, canRetry: false });
        const request = bounded(own.signal, REQUEST_LIMIT_MS);
        const polled = await zoneBoundaryRepository.scanStatus(started.data.scanId, zoneId, request.signal).finally(request.done);
        if (own.signal.aborted) return;
        if (polled.status !== "success") {
          // A moment of no connection or a server hiccup is retried; a refusal (404 expired, 429, 403) is final.
          failures += 1;
          if (polled.httpStatus !== 0 && polled.httpStatus < 500 || failures >= MAX_POLL_FAILURES) { fail(failureText(polled)); return; }
          continue;
        }
        failures = 0;
        if (polled.data.status === "Pending") continue;
        if (polled.data.status === "Failed") { fail(scanFailureText(polled.data.errorCode)); return; }
        const reading = polled.data.reading;
        if (!reading || !reading.zones.some(zone => zone.corners.length > 0)) { fail("Không thấy bảng tọa độ góc nào trong ảnh. Hãy chụp rõ hơn các bảng \"Tọa độ các điểm góc\" rồi thử lại."); return; }
        setState({ phase: "idle", elapsedMs: 0, canRetry: false });
        deliver.current(reading);
        return;
      }
      fail("Đọc ảnh quá 2 phút nên đã dừng. Hãy thử lại; nếu vẫn chậm, chụp lại ảnh nhỏ và rõ hơn.");
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) fail("Chưa đọc được ảnh. Hãy thử lại.");
    }
  }, [zoneId]);

  const cancel = useCallback(() => { control.current?.abort(); setState({ phase: "idle", elapsedMs: 0, canRetry: false }); }, []);
  const retry = useCallback(() => { if (lastPhoto.current) void start(lastPhoto.current); }, [start]);
  return { ...state, start, cancel, retry };
}
