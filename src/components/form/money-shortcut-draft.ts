import { numberTextChange } from "./grouped-number-text";

/**
 * Integer money display hides punctuation. Retain it privately for a subsequently typed suffix:
 * typing 1,5 shows 15 dong, then typing tr reveals 1,5tr and expands to 1.500.000 on blur.
 */
export function updateMoneyShortcutDraft(previous: string, draft: string, incoming: string): string {
  if (/[a-zà-ỹ]/iu.test(previous)) return incoming;
  const change = numberTextChange(previous, incoming);
  const draftPosition = (position: number) => {
    const count = previous.slice(0, position).replace(/[.,\s]/g, "").length;
    let index = 0, seen = 0;
    while (index < draft.length && seen < count) {
      if (!/[.,\s]/.test(draft[index])) seen++;
      index++;
    }
    while (index < draft.length && /[.,\s]/.test(draft[index])) index++;
    return index;
  };
  return draft.slice(0, draftPosition(change.start)) + change.inserted + draft.slice(draftPosition(change.oldEnd));
}
