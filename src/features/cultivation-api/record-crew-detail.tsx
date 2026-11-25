"use client";
import Link from "next/link";
import type { z } from "zod";
import { EmployeeTypeBadge } from "@/features/employee-api/employee-type-badge";
import { useEmployeeKinds } from "@/features/employee-api/use-employee-types";
import { employeeLink } from "@/features/farming-management/entity-links";
import type { crewMember } from "./record-crew-contracts";
import { crewWorkText } from "./record-crew-work-text";

/** The crew of a lot, each member linking to the employee record. */
export function RecordCrewDetail({ crew, label = "Nhân viên thực hiện" }: { crew?: z.infer<typeof crewMember>[]; label?: string }) {
  const kindOf = useEmployeeKinds();
  if (crew === undefined) return null;
  return <section aria-label={label} className="my-3 text-sm"><h4 className="font-medium">{label}</h4>
    {!crew.length ? <p className="text-text-muted">Chưa ghi nhận {label.toLowerCase()}.</p> : <ul className="mt-1 flex flex-wrap gap-3">{crew.map(member => {
      const href = employeeLink(member.id);
      return <li key={member.id}>{href ? <Link className="text-primary underline" href={href}>{member.name}</Link> : member.name}<EmployeeTypeBadge type={kindOf(member.id)} className="ml-1.5" />{member.code ? <small className="text-text-muted"> · {member.code}</small> : null}{crewWorkText(member) ? <small className="block text-text-muted">{crewWorkText(member)}</small> : null}</li>;
    })}</ul>}
  </section>;
}
