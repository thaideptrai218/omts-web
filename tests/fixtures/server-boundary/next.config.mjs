import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../", import.meta.url));
export default {
  turbopack: { root },
  outputFileTracingRoot: root,
  // Keep fresh diagnostic evidence in this intentionally failing fixture only.
  webpack(config) { config.cache = false; return config; },
};
