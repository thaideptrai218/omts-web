"use client";
import { useState } from "react";
import { runBrowserChecks } from "./browser-checks";

export default function CookieFixturePage() {
  const [lines, setLines] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true); setLines([]);
    try { await runBrowserChecks((line) => setLines((old) => [...old, line])); }
    catch (error) { setLines((old) => [...old, "FAIL: " + (error instanceof Error ? error.message : "fixture error")]); }
    finally { setBusy(false); }
  }
  async function clear() {
    const result = await fetch("/check/clear", { method: "POST", headers: { "X-OMTS-Request": "web" } });
    setLines((old) => [...old, result.ok ? "CLEANUP: fixture cookie cleared" : "CLEANUP refused: no cookie overwritten"]);
  }
  return <main style={{ maxWidth: 900, margin: "32px auto", padding: 20, fontFamily: "system-ui", lineHeight: 1.6 }}>
    <h1>OMTS — isolated cookie fixture</h1>
    <p>Fake SID and fake clock only. Not the OMTS application or a login endpoint.</p>
    <p>HTTP loopback verification. HTTPS Secure/__Host- enforcement is not verified.</p>
    <button disabled={busy} onClick={run}>Run browser checks</button>{" "}
    <button disabled={busy} onClick={clear}>Clear fixture cookie</button>
    <ol aria-live="polite">{lines.map((line, index) => <li key={index}>{line}</li>)}</ol>
  </main>;
}
