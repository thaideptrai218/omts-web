"use client";
import Link from "next/link";
import type { z } from "zod";
import { employeeLink } from "@/features/farming-management/entity-links";
import type { crewMember } from "./harvest-crew-contracts";

/** The crew of a lot, each member linking to the employee record. */
export function HarvestCrewDetail({ crew }: { crew?: z.infer<typeof crewMember>[] }) {
  if (crew === undefined) return null;
  return <section aria-label="Nhân viên cùng thu" className="my-3 text-sm"><h4 className="font-medium">Nhân viên cùng thu</h4>
    {!crew.length ? <p className="text-text-muted">Chưa ghi nhận nhân viên cùng thu.</p> : <ul className="mt-1 flex flex-wrap gap-3">{crew.map(member => {
      const href = employeeLink(member.id);
      return <li key={member.id}>{href ? <Link className="text-primary underline" href={href}>{member.name}</Link> : member.name}{member.code ? <small className="text-text-muted"> · {member.code}</small> : null}</li>;
    })}</ul>}
  </section>;
}
