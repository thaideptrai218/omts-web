import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const fixture = "tests/fixtures/cookie-browser";
const eslint = new ESLint({ cwd: root });

describe("cookie fixture participates in the default quality gate", () => {
  beforeAll(async () => {
    // Load Next's ESLint plugins once in setup, outside individual assertions.
    await eslint.calculateConfigForFile(`${fixture}/server.ts`);
  });
  it("includes the authored fixture in npm run lint (also used by CI)", () => {
    const pkg = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8"));
    expect(pkg.scripts.lint.split(/\s+/)).toContain(fixture);
  });
  it.each(["server.ts", "next.config.mjs", "app/page.tsx", "app/check/[action]/route.ts"])(
    "does not ignore authored %s", async (file) => {
      expect(await eslint.isPathIgnored(`${fixture}/${file}`)).toBe(false);
    },
  );
  it.each([".next/server/app/page.js", ".next/types/validator.ts", "next-env.d.ts"])(
    "ignores only generated %s", async (file) => {
      expect(await eslint.isPathIgnored(`${fixture}/${file}`)).toBe(true);
    },
  );
  it("detects an unused variable in fixture source instead of silently skipping it", async () => {
    const [result] = await eslint.lintText("const unusedFixtureValue = 1;\n", { filePath: `${fixture}/server.ts` });
    expect(result.messages.some((message) => message.ruleId === "@typescript-eslint/no-unused-vars")).toBe(true);
  });
});
