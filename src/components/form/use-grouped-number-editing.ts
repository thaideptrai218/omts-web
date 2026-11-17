"use client";
import { useLayoutEffect, useRef, type ChangeEvent, type KeyboardEvent, type RefObject } from "react";
import { deleteNumberGroup, formatNumberEdit, type NumberSelection } from "./grouped-number-text";
import { updateMoneyShortcutDraft } from "./money-shortcut-draft";

/** Restore selection after React commits; refs are only accessed in handlers and layout effects. */
export function useGroupedNumberEditing(
  node: RefObject<HTMLInputElement | null>, text: string, decimals: number,
  onText: (text: string) => void, money = false,
) {
  const selection = useRef<NumberSelection | null>(null);
  const shortcut = useRef<{ display: string; draft: string } | null>(null);
  useLayoutEffect(() => {
    const pending = selection.current;
    if (pending && node.current?.value === pending.text) {
      node.current.setSelectionRange(pending.start, pending.end);
    }
    selection.current = null;
  });

  const apply = (input: HTMLInputElement, incoming: string, start: number, end: number) => {
    let next = formatNumberEdit(text, incoming, start, end, decimals);
    if (money) {
      const previousDraft = shortcut.current?.display === text ? shortcut.current.draft : text.replace(/\./g, "");
      const draft = updateMoneyShortcutDraft(text, previousDraft, incoming);
      if (/[a-zà-ỹ]/iu.test(draft)) {
        next = { text: draft, start: start + draft.length - incoming.length, end: end + draft.length - incoming.length };
      }
      shortcut.current = { display: next.text, draft };
    }
    selection.current = next;
    // Also handle an edit whose formatted text equals the previous state (e.g. a stripped comma).
    input.value = next.text;
    input.setSelectionRange(next.start, next.end);
    onText(next.text);
  };
  return {
    onChange(event: ChangeEvent<HTMLInputElement>) {
      const input = event.currentTarget;
      apply(input, input.value, input.selectionStart ?? input.value.length, input.selectionEnd ?? input.value.length);
    },
    onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
      const input = event.currentTarget;
      if (input.readOnly || input.disabled) return;
      const deleted = deleteNumberGroup(input.value, input.selectionStart ?? 0, input.selectionEnd ?? 0, event.key);
      if (deleted) {
        event.preventDefault();
        apply(input, deleted.text, deleted.start, deleted.end);
      }
    },
    resetShortcut() { shortcut.current = null; },
  };
}
