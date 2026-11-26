import { PLAN, type PlanRoster, type RosterPerson, type RosterState, type StaffingSummary } from "./contracts";

export const rosterStateLabel: Record<RosterState, string> = {
  Invited: "Chờ xác nhận", Confirmed: "Đã xác nhận", ConfirmedManually: "Chủ xác nhận thay", Declined: "Từ chối", External: "Ngoài hệ thống",
};
export const rosterStateTone: Record<RosterState, "neutral" | "info" | "primary" | "warning" | "success"> = {
  Invited: "neutral", Confirmed: "success", ConfirmedManually: "primary", Declined: "warning", External: "info",
};
/** The order of the groups in the table: those who still owe an answer first, then the ones counted, then those who said no. */
export const rosterStateOrder: readonly RosterState[] = ["Invited", "Confirmed", "ConfirmedManually", "External", "Declined"];

/** Plans over: the roster is read only and nothing needs polling any more. */
export const planIsOver = (statusId: number) => statusId === PLAN.completed || statusId === PLAN.cancelled;
/** Plans that still wait for their people: not started, not over. */
export const planWaitsForPeople = (statusId: number) => statusId === PLAN.draft || statusId === PLAN.assigned || statusId === PLAN.received;

/** People counted towards the number needed: those who confirmed (also for them) and those added outside the system. */
export const countedPeople = (summary: StaffingSummary) => summary.confirmed + summary.external;

/** "Đã xác nhận 3/5" for a plan that has a number needed; without one, the people counted so far. */
export function staffingChipText(summary: StaffingSummary) {
  const counted = countedPeople(summary);
  return summary.requiredPeople == null ? `Đã xác nhận ${counted}` : `Đã xác nhận ${counted}/${summary.requiredPeople}`;
}
/** The chip is for a plan that has people chosen or a number needed; an untouched plan shows nothing. */
export const hasStaffing = (summary: StaffingSummary | null | undefined): summary is StaffingSummary =>
  !!summary && (summary.requiredPeople != null || summary.confirmed + summary.invited + summary.declined + summary.external > 0);
/** The warning shown before starting to harvest while people are missing (never a block). */
export const shortHarvestWarning = (summary: StaffingSummary | null | undefined) =>
  summary && summary.requiredPeople != null && summary.missing > 0 ? `Mới có ${countedPeople(summary)}/${summary.requiredPeople} người xác nhận. Vẫn bắt đầu thu?` : undefined;

/** Who confirmed or declined between two reads of the roster. Rows are compared by id, so a person added or taken off is not reported. */
export function describeRosterChanges(before: PlanRoster | undefined, after: PlanRoster): string[] {
  if (!before) return [];
  const was = new Map<string, RosterPerson>(before.people.map((person) => [person.id, person]));
  const notes: string[] = [];
  for (const person of after.people) {
    const earlier = was.get(person.id);
    if (!earlier || earlier.state === person.state) continue;
    if (person.state === "Confirmed") notes.push(`${person.name} vừa xác nhận`);
    else if (person.state === "Declined") notes.push(`${person.name} vừa từ chối`);
  }
  return notes;
}
