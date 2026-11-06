import { z } from "zod";

// SQL rowVersion is serialized as base64. Its contents have no client-side meaning.
export const employeeRowVersionSchema = z.base64().min(1);
