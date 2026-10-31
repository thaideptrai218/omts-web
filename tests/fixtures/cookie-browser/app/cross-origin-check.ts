// Browser-only test exercise: a real native form submits from localhost to the
// 127.0.0.1 fixture. No forged Origin/metadata via evaluate or test client fetch.
export function crossOriginFormCheck(): Promise<string> {
  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.title = "Cross-origin cookie fixture";
    frame.hidden = true;
    const timer = setTimeout(() => finish(new Error("Cross-origin form did not complete")), 5000);
    function finish(error?: Error) {
      clearTimeout(timer);
      frame.remove();
      if (error) reject(error); else resolve("cross-origin native form rejected");
    }
    frame.onload = () => {
      try {
        // The initial foreign document is unreadable. After form navigation the
        // target is same-origin again, and its redacted rejection can be read.
        if (frame.contentWindow?.location.origin !== location.origin) return;
        const text = frame.contentDocument?.body.textContent ?? "";
        if (!text.includes('"status":"rejected"')) { finish(new Error("Unexpected form result")); return; }
        finish();
      } catch { /* Wait for the target-origin form response, not source load. */ }
    };
    frame.src = `http://localhost:${location.port}/foreign`;
    document.body.append(frame);
  });
}
