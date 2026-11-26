"use client";
import { useCallback } from "react";
import { z } from "zod";
import { nurseryRepository } from "@/features/nursery-api/repository";
import { Select, useRemote } from "@/features/operations/ui";

export const responsibleOptions = z.array(z.object({ accountId: z.guid(), name: z.string(), isSelf: z.boolean() }));
type Option = z.infer<typeof responsibleOptions>[number];

/** Who can be named "Người phụ trách" in the zone: the signed-in user, and for the Owner the zone's managers. */
export function useResponsiblePeople(zoneId: string) {
  const remote = useRemote(useCallback((signal: AbortSignal) => nurseryRepository.read("responsible-people", { zoneId }, responsibleOptions, signal), [zoneId]));
  return remote.data ?? [];
}

const optionText = (option: Option) => option.isSelf ? "Tôi tự làm" : `Quản lý vùng: ${option.name}`;

/** The text of the choice, for the review step. */
export function responsibleText(people: readonly Option[], value: string) {
  const chosen = people.find(option => value ? option.accountId === value : option.isSelf);
  return chosen ? optionText(chosen) : "—";
}

/**
 * "Người phụ trách": a label on the record, nobody is notified. On a new record an empty value means the signed-in user (the API stores them).
 * `saved` is the person already on a record being edited, kept choosable even when they are no longer offered; null for a record without one.
 */
export function ResponsiblePersonField({ people, value, onChange, saved }: {
  people: readonly Option[]; value: string; onChange(value: string): void; saved?: { id?: string | null; name?: string | null } | null;
}) {
  const shown = value || (saved === undefined ? people.find(option => option.isSelf)?.accountId ?? "" : "");
  const keep = saved?.id && !people.some(option => option.accountId === saved.id) ? saved : undefined;
  return <Select label="Người phụ trách" value={shown} onChange={event => onChange(event.target.value)}>
    {!shown && <option value="">Chưa ghi</option>}
    {keep && <option value={keep.id!}>{keep.name ?? "Người đã ghi trước đó"}</option>}
    {people.map(option => <option key={option.accountId} value={option.accountId}>{optionText(option)}</option>)}
  </Select>;
}
