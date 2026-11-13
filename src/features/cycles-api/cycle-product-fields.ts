import { z } from "zod";

/**
 * The farmed product ("loại hàu nuôi", e.g. Hàu múp, Hàu gầy 3cm) of a cycle: the Product catalogue entry the raft grows and sells.
 * Tolerant on purpose (nullish): a legacy cycle has none, and an older backend does not send these fields yet.
 */
export const cycleProductFields = { productId: z.string().nullish(), productName: z.string().nullish() };
