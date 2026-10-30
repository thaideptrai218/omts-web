"use client";
import { useEffect, useRef, useState } from "react";
import { Dialog } from "./dialog";
import { Button } from "./button";

// Keep confirmation in the app rather than blocking the browser's JS thread.
export function useActionDialog() {
  const [request, setRequest] = useState<{ message: string; reason: boolean }>();
  const [value, setValue] = useState("");
  const resolve = useRef<((result: string | null) => void) | undefined>(undefined);
  useEffect(() => () => { resolve.current?.(null); resolve.current = undefined; }, []);
  function ask(message: string, reason: boolean): Promise<string | null> {
    if (resolve.current) return Promise.resolve(null);
    setValue(""); setRequest({ message, reason });
    return new Promise((done) => { resolve.current = done; });
  }
  function finish(result: string | null) {
    const done = resolve.current; resolve.current = undefined; setRequest(undefined); done?.(result);
  }
  return {
    confirm: async (message: string) => (await ask(message, false)) !== null,
    prompt: (message: string) => ask(message, true),
    dialog: request && <Dialog open title={request.reason ? request.message : "Xác nhận thao tác"} mobileLayout="compact" onOpenChange={(open) => { if (!open) finish(null); }}>
      {!request.reason && <p>{request.message}</p>}
      {request.reason && <label className="block">Lý do<textarea className="mt-2 min-h-24 w-full rounded-control border border-border-strong p-3" maxLength={1000} value={value} onChange={(event) => setValue(event.target.value)} autoFocus /></label>}
      <div className="mt-5 flex flex-wrap gap-3"><Button className="w-auto" disabled={request.reason && !value.trim()} onClick={() => finish(request.reason ? value.trim() : "confirmed")}>Đồng ý</Button>
        <Button className="w-auto" variant="secondary" onClick={() => finish(null)}>Quay lại</Button></div>
    </Dialog>,
  };
}
