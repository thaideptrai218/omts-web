"use client";
import Link from "next/link";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { operationAllowed } from "@/features/operations/permissions";
import { lotHref } from "./product-helpers";

/** A harvest lot code that opens its trace by code; plain text for an account that may not open lot tracing. */
export function LotLink({ code, className, target }: { code: string; className?: string; target?: string }) {
  const { identity, permissions } = useApiWorkspace();
  return operationAllowed("lot-tracing", identity, permissions.functionPermissions)
    ? <Link className={className} href={lotHref(code)} target={target}>{code}</Link> : <span>{code}</span>;
}
