"use client";
import { useRef } from "react";
import { useActionDialog } from "@/components/ui/use-action-dialog";

/**
 * Shared "unsaved edits" guard of a management screen. An open in-place editor reports its dirty state through `dirty`;
 * every action that would drop it (other row, tab, filter, page) goes through `leave`, which asks once before proceeding.
 */
export function useUnsavedGuard() {
  const confirmation = useActionDialog();
  const dirty = useRef(false);
  async function leave(apply: () => void) {
    if (dirty.current && !(await confirmation.confirm("Bỏ các thay đổi chưa lưu?"))) return;
    dirty.current = false;
    apply();
  }
  return { dirty, leave, dialog: confirmation.dialog };
}
export type UnsavedGuard = ReturnType<typeof useUnsavedGuard>;
