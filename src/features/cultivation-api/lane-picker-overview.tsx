"use client";
import type { ComponentProps } from "react";
import { LaneOverview } from "@/features/farming-management/lane-overview";
import { OperatingLaneOverview } from "@/features/rafts-api/operating-lane-overview";
import type { LaneOperatingScope } from "@/features/rafts-api/lane-operating-details";
export type LanePickerDraftProps = { onDirty?(dirty: boolean): void; onPending?(pending: boolean): void };

/**
 * Record fields stay in the parent draft; editing existing lane progress is an independent, reasoned command.
 * The picker lives inside a record dialog, so lane details open in a side panel rather than a popup over the dialog.
 */
export function LanePickerOverview({ scope, onDirty, onPending, ...props }: ComponentProps<typeof LaneOverview> & { scope?: LaneOperatingScope } & LanePickerDraftProps) {
  return scope ? <OperatingLaneOverview detailPlacement="side" {...props} scope={scope} onDirty={onDirty} onPending={onPending} /> : <LaneOverview detailPlacement="side" {...props} />;
}
