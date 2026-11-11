"use client";
import { StatusPill } from "@/components/ui/management-page";
import { DISPOSAL, disposalStatusLabel } from "@/features/products/contracts";

export const DISPOSALS_PATH = "/sales/disposals";
export const disposalHref = (code: string) => `${DISPOSALS_PATH}?code=${encodeURIComponent(code)}`;

export function DisposalStatus({ statusId }: { statusId: number }) {
  return <StatusPill tone={statusId === DISPOSAL.completed ? "success" : statusId === DISPOSAL.cancelled ? "danger" : "neutral"}>{disposalStatusLabel[statusId] ?? ""}</StatusPill>;
}
