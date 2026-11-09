import { useRef, useState } from "react";
import type { UseFormClearErrors, UseFormSetValue } from "react-hook-form";
import type { BusinessActivityRow } from "@/features/cooperative-profile/components/business-activity-editor";
import { createActivityRows } from "@/features/cooperative-profile/components/cooperative-profile-form-mapping";
import type { CooperativeProfileFormValues } from "@/features/cooperative-profile/schemas/cooperative-profile-schema";

type BusinessActivityFormBindings = Readonly<{
  clearErrors: UseFormClearErrors<CooperativeProfileFormValues>;
  setValue: UseFormSetValue<CooperativeProfileFormValues>;
}>;

/**
 * Keeps stable row ids for the business-activity list and mirrors every change
 * into the `businessActivities` form value so validation and dirty state stay in sync.
 */
export function useBusinessActivityRows(
  initialActivities: readonly string[],
  { clearErrors, setValue }: BusinessActivityFormBindings,
) {
  const activitySequence = useRef(10);
  const [activityRows, setActivityRows] = useState(() => createActivityRows(initialActivities));

  function updateActivities(rows: readonly BusinessActivityRow[]) {
    setActivityRows([...rows]);
    setValue(
      "businessActivities",
      rows.map((row) => row.value),
      { shouldDirty: true, shouldValidate: true },
    );
  }

  function addActivity() {
    activitySequence.current += 1;
    const id = `activity-${activitySequence.current}`;
    updateActivities([...activityRows, { id, value: "" }]);
    requestAnimationFrame(() => document.getElementById(`business-activity-${id}`)?.focus());
  }

  function removeActivity(id: string) {
    if (activityRows.length === 1) return;
    updateActivities(activityRows.filter((row) => row.id !== id));
  }

  function updateActivity(id: string, value: string) {
    clearErrors("businessActivities");
    updateActivities(
      activityRows.map((row) => (row.id === id ? { ...row, value } : row)),
    );
  }

  /** Replaces rows without touching the form value (the caller resets the form itself). */
  function resetActivityRows(activities: readonly string[]) {
    setActivityRows(createActivityRows(activities));
  }

  return { activityRows, addActivity, removeActivity, resetActivityRows, updateActivity };
}
