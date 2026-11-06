"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createPausableTimer,
  type PausableTimer,
} from "@/components/ui/pausable-timer";

type ToastTone = "danger" | "info" | "success";

type ToastInput = Readonly<{
  description?: string;
  durationMs?: number;
  title: string;
  tone?: ToastTone;
}>;

type ToastMessage = ToastInput & Readonly<{ id: number }>;

type ToastContextValue = Readonly<{
  notify(toast: ToastInput): void;
}>;

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastTone, string> = {
  danger: "border-danger/30 bg-surface text-danger",
  info: "border-info/30 bg-surface text-info",
  success: "border-success/30 bg-surface text-success",
};

function ToastItem({
  message,
  onDismiss,
}: {
  message: ToastMessage;
  onDismiss(id: number): void;
}) {
  const timerRef = useRef<PausableTimer | null>(null);

  useEffect(() => {
    const timer = createPausableTimer(
      () => onDismiss(message.id),
      message.durationMs ?? 4000,
    );
    timerRef.current = timer;

    return () => {
      timer.cancel();
      timerRef.current = null;
    };
  }, [message.durationMs, message.id, onDismiss]);

  const tone = message.tone ?? "info";

  return (
    <div
      className={`pointer-events-auto rounded-card border p-4 shadow-card motion-safe:animate-[omts-reveal-from-bottom_180ms_ease-out_both] ${toneStyles[tone]}`}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          timerRef.current?.resume();
        }
      }}
      onFocusCapture={() => timerRef.current?.pause()}
      onMouseEnter={() => timerRef.current?.pause()}
      onMouseLeave={() => timerRef.current?.resume()}
      role={tone === "danger" ? "alert" : "status"}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-text">{message.title}</p>
          {message.description && (
            <p className="mt-1 text-sm leading-6 text-text-muted">{message.description}</p>
          )}
        </div>
        <button
          aria-label="Đóng thông báo"
          className="grid size-9 shrink-0 place-items-center rounded-control text-lg text-text-muted hover:bg-surface-subtle hover:text-text"
          onClick={() => onDismiss(message.id)}
          type="button"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<readonly ToastMessage[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setMessages((current) => current.filter((message) => message.id !== id));
  }, []);

  const notify = useCallback((input: ToastInput) => {
    nextId.current += 1;
    const message = { ...input, id: nextId.current };
    setMessages((current) => [...current.slice(-2), message]);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-label="Thông báo hệ thống"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 grid gap-3 sm:left-auto sm:right-5 sm:w-full sm:max-w-sm"
      >
        {messages.map((message) => (
          <ToastItem key={message.id} message={message} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider.");

  return context;
}
