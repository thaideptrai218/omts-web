import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { secretCanaries } from "../tests/fixtures/serialization/canaries.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const fixture = fileURLToPath(new URL("../tests/fixtures/serialization", import.meta.url));
const next = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));

function filesUnder(directory) {
  if (!existsSync(directory)) throw new Error("Missing serialization build output");
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? filesUnder(join(directory, entry.name)) : [join(directory, entry.name)]);
}
function assertNoCanary(value) {
  if (secretCanaries.some((canary) => value.includes(canary))) throw new Error("Secret canary escaped serialization boundary");
}
function build(compiler, unsafe) {
  // Negative fixture only: Next production redacts the actual error message.
  // Documented diagnostic prerender exposes the exact guard for this assertion;
  // these isolated build outputs are never deployed or served as the product.
  const result = spawnSync(process.execPath, [next, "build", fixture, compiler, ...(unsafe ? ["--debug-prerender"] : [])], {
    cwd: root, encoding: "utf8", windowsHide: true, timeout: 45_000, maxBuffer: 2 * 1024 * 1024,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", OMTS_TEST_UNSAFE_DTO: unsafe ? "1" : "0" },
  });
  const output = (result.stdout ?? "") + (result.stderr ?? "");
  assertNoCanary(output);
  if (result.error || result.signal || result.status !== (unsafe ? 1 : 0)
    || (unsafe && !output.includes("SERVER_AUTH_TOKENS_NOT_SERIALIZABLE"))) {
    // Only fake fixture data is used, but avoid dumping arbitrary compiler output.
    throw new Error(`Unexpected ${compiler} ${unsafe ? "negative" : "positive"} build outcome (exit ${result.status})`);
  }
}

try {
  for (const compiler of ["--webpack", "--turbopack"]) {
    build(compiler, false);
    const publicArtifacts = filesUnder(join(fixture, ".next/server/app")).filter((f) => /\.(html|rsc)$/.test(f));
    if (!publicArtifacts.some((f) => f.endsWith(".html")) || !publicArtifacts.some((f) => f.endsWith(".rsc"))) {
      throw new Error("Positive fixture did not produce both HTML and RSC evidence");
    }
    const rendered = publicArtifacts.map((f) => readFileSync(f, "utf8")).join("\n");
    if (!rendered.includes("Tên cá nhân fixture")) throw new Error("Positive DTO did not reach rendered output");
    for (const file of [...publicArtifacts, ...filesUnder(join(fixture, ".next/static"))]) {
      assertNoCanary(readFileSync(file, "utf8"));
    }
    console.log(`PASS: ${compiler} DTO reached HTML/RSC; public artifacts and build logs contain no secret canary.`);
    build(compiler, true);
    console.log(`PASS: ${compiler} diagnostic RSC build rejected token props with the exact JSON guard; logs contain no secret canary.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Serialization verification failed");
  process.exitCode = 1;
}
