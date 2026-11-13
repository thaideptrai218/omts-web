import { z } from "zod";

/**
 * The "loại hàu" of a cycle (e.g. Hàu múp, Hàu gầy 3cm): DERIVED by the backend from the seed item of the nursed batch, so it is read only.
 * `seedItemName` is that seed item. Tolerant on purpose (nullish): a legacy cycle has none, and a seed item may not have a product yet.
 */
export const cycleProductFields = { productId: z.string().nullish(), productName: z.string().nullish(), seedItemName: z.string().nullish() };
