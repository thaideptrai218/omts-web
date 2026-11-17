import { z } from "zod";

/** Write side: employee ids of the lot's crew (API contract of 12/11/2026: at most 100, each once). */
export const crewIds = z.array(z.guid()).max(100).refine(ids => new Set(ids).size === ids.length);
/** Read side: `crew: [{ id, code, name }]` in HarvestLotView, listed by name. */
export const crewMember = z.object({ id: z.guid(), code: z.string().nullish(), name: z.string() });
export const crewReadFields = { crew: z.array(crewMember).optional() };
/** GET /api/rafts/{id}/crew-suggestions?date=: employees assigned to that raft on that day. */
export const crewSuggestions = z.object({ employees: z.array(crewMember) });
