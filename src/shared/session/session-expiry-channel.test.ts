import { describe, expect, it, vi } from "vitest";
import { createSessionExpiryChannel } from "@/shared/session/session-expiry-channel";

describe("createSessionExpiryChannel", () => {
  it("publishes MSG19 to every active listener", () => {
    const channel = createSessionExpiryChannel();
    const firstListener = vi.fn();
    const secondListener = vi.fn();

    channel.subscribe(firstListener);
    channel.subscribe(secondListener);
    channel.publish({ code: "MSG19" });

    expect(firstListener).toHaveBeenCalledWith({ code: "MSG19" });
    expect(secondListener).toHaveBeenCalledWith({ code: "MSG19" });
  });

  it("stops notifying a listener after unsubscribe", () => {
    const channel = createSessionExpiryChannel();
    const listener = vi.fn();
    const unsubscribe = channel.subscribe(listener);

    unsubscribe();
    channel.publish({ code: "MSG19" });

    expect(listener).not.toHaveBeenCalled();
  });

  it("continues notifying when another listener throws", () => {
    const channel = createSessionExpiryChannel();
    const healthyListener = vi.fn();

    channel.subscribe(() => {
      throw new Error("observer failed");
    });
    channel.subscribe(healthyListener);
    channel.publish({ code: "MSG19" });

    expect(healthyListener).toHaveBeenCalledOnce();
  });
});
