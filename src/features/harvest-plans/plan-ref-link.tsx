"use client";
import Link from "next/link";
import { usePlanAccess } from "./plan-access";
import { planHref } from "./plan-labels";

/** The code of the plan a lot was recorded from: a link that opens the plan in its list, plain text for an account that may not read plans. */
export function PlanRefLink({ code, className }: { code: string; className?: string }) {
  const { view } = usePlanAccess();
  return view ? <Link className={className} href={planHref(code)}>{code}</Link> : <span>{code}</span>;
}
