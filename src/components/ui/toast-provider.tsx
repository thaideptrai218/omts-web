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

import { InterfaceIcon } from "@/components/ui/interface-icon";
import styles from "./toast-provider.module.css";

type ToastTone = "danger" | "info" | "success" | "warning";

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

/** Errors stay longer so they can be read; a success only confirms what the user just did. */
const defaultDuration: Record<ToastTone, number> = { danger: 6000, warning: 5000, info: 4000, success: 3500 };

function ToneIcon({ tone }: { tone: ToastTone }) {
  if (tone === "success") return <InterfaceIcon name="check" className="" />;
  if (tone === "danger") return <InterfaceIcon name="close" className="" />;
  return <span>{tone === "warning" ? "!" : "i"}</span>;
}

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
      message.durationMs ?? defaultDuration[message.tone ?? "info"],
    );
    timerRef.current = timer;

    return () => {
      timer.cancel();
      timerRef.current = null;
    };
  }, [message.durationMs, message.id, message.tone, onDismiss]);

  const tone = message.tone ?? "info";

  return (
    <div
      className={`${styles.toast} ${styles[tone]}`}
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
      <span className={styles.icon} aria-hidden="true"><ToneIcon tone={tone} /></span>
      <div className={styles.body}>
        <p className={styles.title}>{message.title}</p>
        {message.description && <p className={styles.description}>{message.description}</p>}
      </div>
      <button aria-label="Đóng thông báo" className={styles.close} onClick={() => onDismiss(message.id)} type="button">
        <InterfaceIcon name="close" className="" aria-hidden="true" />
      </button>
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
      <div aria-label="Thông báo hệ thống" className={styles.region}>
        {messages.map((message) => (
          <ToastItem key={message.id} message={message} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Like useToast, but undefined outside a ToastProvider: for optional notices that must not break a screen rendered without one. */
export function useOptionalToast(): ToastContextValue | undefined {
  return useContext(ToastContext) ?? undefined;
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider.");

  return context;
}
