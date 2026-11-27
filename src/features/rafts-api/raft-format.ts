import { viDateTime } from "@/features/purchase-documents/document-parts";

/** dd/mm/yyyy HH:mm in Vietnam time, "—" for a missing or unreadable value. */
export const fmtDateTime = (value?: string | null) => value && !Number.isNaN(Date.parse(value)) ? viDateTime(value) : "—";
