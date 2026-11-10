// Reads only, apart from opening/closing dedicated login sessions.
const origin = "http://localhost:3002";
for (const username of ["sysadmin", "owner"]) {
  const cookies = new Map();
  async function request(path, body) {
    const response = await fetch(origin + path, { method: body === undefined ? "GET" : "POST", signal: AbortSignal.timeout(60000), redirect: "error", headers: { Cookie: [...cookies].map(([k,v]) => `${k}=${v}`).join("; "), ...(body !== undefined ? { Origin: origin, "X-OMTS-Request": "web", ...(body !== null ? { "Content-Type": "application/json" } : {}) } : {}) }, body: body == null ? undefined : JSON.stringify(body) });
    for (const c of response.headers.getSetCookie()) { const p = c.split(";",1)[0], i=p.indexOf("="); cookies.set(p.slice(0,i),p.slice(i+1)); }
    const value = await response.json();
    return { http: response.status, value };
  }
  const assert = (condition, label) => { if (!condition) throw new Error(`${username}: ${label}`); console.log(`PASS ${username}: ${label}`); };
  try {
    const login = await request("/api/auth/login", { identifier: username, password: "Demo@1234" });
    assert([200,201].includes(login.http), `API login HTTP ${login.http} ${login.value.status ?? login.value.code ?? ""}`);
    assert((await request("/api/auth/session")).http === 200, "session");
    const list = await request("/api/admin/accounts?page=1");
    assert(list.http === (username === "sysadmin" ? 200 : 403), "admin list authorization");
    if (username === "sysadmin") {
      assert(list.value.data.items.some(v => v.username === "sysadmin"), "real DB sysadmin visible");
      const id = list.value.data.items[0].id;
      assert((await request(`/api/admin/accounts?id=${id}`)).http === 200, "account detail");
      assert((await request("/api/admin/accounts?activity=1")).http === 200, "admin activity");
      const protectedAccount = (await request("/api/admin/accounts?search=sysadmin")).value.data.items.find(v => v.username === "sysadmin");
      assert((await request("/api/admin/accounts", { id: protectedAccount.id, action: "lock", reason: "QA protection check", rowVersion: protectedAccount.rowVersion })).http === 403, "cannot lock administrator");
      if (process.argv.includes("--test-lock-fixture")) {
        const fixture = (await request("/api/admin/accounts?search=qa.admin.lockcheck.20261106")).value.data.items.find(v => v.username === "qa.admin.lockcheck.20261106");
        assert(fixture?.statusId === 301, "dedicated lock fixture active");
        const locked = await request("/api/admin/accounts", { id: fixture.id, action: "lock", reason: "QA kiểm tra khóa tài khoản", rowVersion: fixture.rowVersion });
        assert(locked.http === 200 && locked.value.data.statusId === 302, "lock saved in DB");
        assert((await request("/api/admin/accounts", { id: fixture.id, action: "unlock", reason: "QA stale version check", rowVersion: fixture.rowVersion })).http === 409, "stale version rejected");
        const unlocked = await request("/api/admin/accounts", { id: fixture.id, action: "unlock", reason: "QA khôi phục tài khoản kiểm thử", rowVersion: locked.value.data.rowVersion });
        assert(unlocked.http === 200 && unlocked.value.data.statusId === 301, "unlock saved in DB");
        const activity = await request("/api/admin/accounts?activity=1");
        assert(activity.value.data.filter(v => v.recordCode === fixture.username).length >= 2, "lock and unlock audited");
      }
    }
  } finally { await request("/api/auth/logout", null); }
}
