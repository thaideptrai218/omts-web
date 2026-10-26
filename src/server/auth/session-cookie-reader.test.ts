import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { readSessionCookie } from "./session-cookie-reader";
import { hashSessionId } from "./session-id";

const sid = "A".repeat(43);
const name = "__Host-omts_web_sid";
const pair = `${name}=${sid}`;

describe("raw BFF Cookie header reader", () => {
  it.each([null, undefined, "", "theme=dark", `omts_web_sid_dev=${sid}`])(
    "reports missing without treating another profile as a fallback: %j", (header) => {
      expect(readSessionCookie(header, name)).toEqual({ status: "missing" });
    },
  );

  it.each([pair, `theme=dark; ${pair}; locale=vi`, `\t${pair}\t`, `theme="dark"; ${pair}`,
    `opaque=a=b==; ${pair}`, `theme=; ${pair}`, `theme=dark; theme=light; ${pair}`])(
    "returns only a hash for one canonical SID: %s", (header) => {
      const result = readSessionCookie(header, name);
      expect(result).toEqual({ status: "found", idHash: hashSessionId(sid) });
      expect(JSON.stringify(result)).not.toContain(sid);
      expect(Object.isFrozen(result)).toBe(true);
    },
  );

  it.each([`${pair}; ${pair}`, `${pair}; ${name}=${"B".repeat(42)}A`,
    `${name}=; ${pair}`, `${pair}; ${name}=`])("rejects duplicate target cookies: %s", (header) => {
      expect(readSessionCookie(header, name)).toEqual({ status: "invalid-cookie" });
    });

  it.each(["", "a".repeat(42), "a".repeat(44), "A".repeat(42) + "B", `"${sid}"`,
    `%41${sid.slice(1)}`, `${sid}=`, `${sid.slice(1)}+`, `${sid.slice(1)}/`, "null", "undefined"])(
    "rejects invalid/noncanonical SID values: %s", (value) => {
      expect(readSessionCookie(`${name}=${value}`, name)).toEqual({ status: "invalid-cookie" });
    },
  );

  it.each([1, {}, [], true, `${pair}\r\nX-Leak: fake`, `${pair}\0`, `${pair}\x7f`, `${pair}; theme=tiếng`,
    `${pair}; bad name=x`, `${pair}; broken`, `${pair};`, `${name} =${sid}`, `${name}= ${sid}`,
    `${pair}, ${pair}`, `${pair}; theme=a,b`, `${pair}; theme="unclosed`, `${pair}; theme=a\\b`,
    "x=" + "x".repeat(16_384)])("rejects malformed or oversized input without echo: %j", (header) => {
      const result = readSessionCookie(header, name);
      expect(result).toEqual({ status: "invalid-cookie" });
      expect(JSON.stringify(result)).not.toContain(sid);
      expect(Object.isFrozen(result)).toBe(true);
    });

  it("accepts exactly the technical size limit", () => {
    const header = `x=${"x".repeat(16_384 - pair.length - 4)}; ${pair}`;
    expect(header).toHaveLength(16_384);
    expect(readSessionCookie(header, name).status).toBe("found");
  });

  it("uses case-sensitive, exact cookie names and keeps profiles separate", () => {
    expect(readSessionCookie(`${name.toUpperCase()}=${sid}; x${pair}`, name).status).toBe("missing");
    expect(readSessionCookie(`${pair}; omts_web_sid_dev=${sid}`, "omts_web_sid_dev").status).toBe("found");
    expect(readSessionCookie(pair, "wrong" as typeof name).status).toBe("invalid-cookie");
  });

  it("does not coerce objects or invoke attacker-supplied getters", () => {
    const input = { toString() { throw new Error("fake-secret"); } };
    expect(readSessionCookie(input, name)).toEqual({ status: "invalid-cookie" });
  });
});
