// Read-only readiness check apart from opening and closing its own login sessions.
const origin = process.env.OMTS_QA_WEB_ORIGIN || "http://localhost:3002";
const password = process.env.OMTS_QA_PASSWORD || "Demo@1234";
let failed = false;
for (const username of ["owner", "quanlyvung1", "quanlyvung2", "ketoan"]) {
  const cookies = new Map();
  async function request(path, body) {
    const response = await fetch(new URL(path, origin), { method: body === undefined ? "GET" : "POST", redirect: "error", signal: AbortSignal.timeout(60000), headers: { Accept: "application/json", Cookie: [...cookies].map(([k,v]) => `${k}=${v}`).join("; "), ...(body === undefined ? {} : { ...(body === null ? {} : { "Content-Type": "application/json" }), Origin: origin, "X-OMTS-Request": "web" }) }, body: body == null ? undefined : JSON.stringify(body) });
    for (const cookie of response.headers.getSetCookie()) { const pair = cookie.split(";",1)[0], index = pair.indexOf("="); if (/Max-Age=0/i.test(cookie)) cookies.delete(pair.slice(0,index)); else cookies.set(pair.slice(0,index),pair.slice(index+1)); }
    const value = await response.json().catch(() => ({}));
    return { http: response.status, ...value };
  }
  const check = (label,result,allowed = [200]) => { const ok = allowed.includes(result.http); if (!ok) failed = true; console.log(`${username} ${label}: ${ok ? "OK" : "FAIL"} HTTP ${result.http} ${result.status ?? ""}${result.code ? ` ${result.code}` : ""}`); };
  try {
    const login = await request("/api/auth/login", { identifier: username, password }); check("login",login);
    if (!["created", "active"].includes(login.status)) { failed = true; continue; }
    check("session",await request("/api/auth/session"));
    check("session-repeat",await request("/api/auth/session"));
    const inbox = await request("/api/inbox?page=1"); check("inbox", inbox);
    if (username !== "owner") check("audit-forbidden", await request("/api/audit-events?page=1&pageSize=20"), [403]);
    if (username === "owner") {
      const audit = await request("/api/audit-events?page=1&pageSize=20"); check("audit", audit);
      if (audit.data?.page?.items[0]) check("audit-detail", await request(`/api/audit-events?id=${audit.data.page.items[0].id}`));
      const types = new Set();
      for (const row of inbox.data?.items ?? []) {
        if (row.canOpenRecord && !types.has(row.relatedRecordType)) { types.add(row.relatedRecordType); check(`notification-open-${row.relatedRecordType}`, await request(`/api/inbox?open=${row.id}`)); }
      }
      if (process.argv.includes("--mark-demo-notification")) {
        const row = inbox.data?.items?.find(item => item.relatedRecordCode === "PN000024");
        if (row) { check("mark-demo-notification", await request("/api/inbox", { action: "read", id: row.id }));
          const current = await request("/api/inbox?page=1"); check("read-state-persisted", { http: current.data?.items?.find(item => item.id === row.id)?.readAt ? 200 : 502 }); }
      }
    }
    if (["owner","ketoan"].includes(username)) {
      check("receipts",await request("/api/operations/purchase-receipts?action=list&page=1&pageSize=20"));
      check("supplier-payments",await request("/api/operations/supplier-payments?action=list&page=1&pageSize=20"));
      check("supplier-debts",await request("/api/operations/supplier-payments?action=debts"));
    }
    const zones = await request("/api/workspace/zones?page=1&pageSize=100"); check("zones",zones,username === "ketoan" ? [200,403] : [200]);
    if (username === "ketoan") continue;
    const zone = zones.data?.items?.find(v => v.statusId === 101);
    if (!zone) { failed=true; console.log(`${username} no active zone`); continue; }
    const cycles = await request(`/api/operations/cultivation-cycles?action=list&zoneId=${zone.id}`); check("cycles",cycles);
    const raft = cycles.data?.find(v => v.cycle && !v.cycle.closeDate);
    if (!raft) { failed=true; console.log(`${username} no open cycle`); continue; }
    const query = `&id=${raft.cycle.id}&zoneId=${zone.id}`;
    check("cycle-detail",await request(`/api/operations/cultivation-cycles?action=detail${query}`));
    check("logs",await request(`/api/operations/cultivation-cycles?action=logs${query}`));
    check("seeding",await request(`/api/operations/seeding?action=list${query}`));
    check("materials",await request(`/api/operations/material-usages?action=list&id=${raft.raftId}&zoneId=${zone.id}`));
    const harvest = await request(`/api/operations/harvest?action=list&id=${raft.raftId}&zoneId=${zone.id}`); check("harvest",harvest);
    if (harvest.data?.lots?.[0]) {
      const detail=await request(`/api/operations/harvest?action=detail&id=${harvest.data.lots[0].id}&zoneId=${zone.id}`); check("harvest-detail",detail);
      if (detail.data?.photos?.[0]) {
        const image=await fetch(new URL(detail.data.photos[0].url,origin), {headers:{Cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join("; ")},signal:AbortSignal.timeout(30000)});
        check("harvest-photo",{http:image.status,status:image.headers.get("content-type")});
      }
    }
  } catch { failed = true; console.log(`${username}: FAIL request unavailable`); }
  finally { try { await request("/api/auth/logout",null); } catch { /* no token or cookie output */ } }
}
process.exitCode = failed ? 1 : 0;
