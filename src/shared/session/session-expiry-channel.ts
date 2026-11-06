import type { AppMessage } from "@/shared/messages/message-catalog";

export type SessionExpiredMessage = AppMessage & Readonly<{ code: "MSG19" }>;
export type SessionExpiryListener = (message: SessionExpiredMessage) => void;

export type SessionExpiryChannel = Readonly<{
  publish(message: SessionExpiredMessage): void;
  subscribe(listener: SessionExpiryListener): () => void;
}>;

export function createSessionExpiryChannel(): SessionExpiryChannel {
  const listeners = new Set<SessionExpiryListener>();

  return {
    publish(message) {
      listeners.forEach((listener) => {
        try {
          listener(message);
        } catch {
          // One observer must not prevent the remaining security cleanup.
        }
      });
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const sessionExpiryChannel = createSessionExpiryChannel();
