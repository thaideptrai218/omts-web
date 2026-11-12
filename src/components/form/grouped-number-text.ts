import { groupDigits } from "./money-text";

export type NumberSelection = { text: string; start: number; end: number };

/** Describe the single replacement performed by typing, deleting, or pasting. */
export function numberTextChange(before: string, after: string) {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let oldEnd = before.length, newEnd = after.length;
  while (oldEnd > start && newEnd > start && before[oldEnd - 1] === after[newEnd - 1]) {
    oldEnd--; newEnd--;
  }
  return { start, oldEnd, inserted: after.slice(start, newEnd) };
}

/** Group only the integer; preserve every fraction digit, leading zero and unfinished comma. */
export function groupNumberText(text: string, decimals: number): string {
  if (!/^-?[\d.,\s]*$/.test(text)) return text;
  const compact = text.replace(/\s/g, "");
  if (decimals === 0) return groupDigits(compact.replace(/[.,]/g, ""));
  const comma = compact.lastIndexOf(",");
  const whole = (comma < 0 ? compact : compact.slice(0, comma)).replace(/[.,]/g, "");
  const fraction = comma < 0 ? "" : compact.slice(comma + 1).replace(/\./g, "");
  return `${groupDigits(whole)}${comma < 0 ? "" : `,${fraction}`}`;
}

/** Canonical display -> machine draft, without conversion to Number or loss of trailing zeros. */
export function ungroupNumberText(text: string): string {
  return text.replace(/\./g, "").replace(",", ".");
}

/** Count digits to the left; comma and sign are anchors so a trailing comma keeps its caret. */
export function groupedNumberCaret(before: string, after: string, position: number): number {
  const anchors = before.slice(0, position).replace(/[.\s]/g, "").length;
  if (!anchors) return 0;
  let seen = 0;
  for (let index = 0; index < after.length; index++) {
    if (!/[.\s]/.test(after[index]) && ++seen === anchors) return index + 1;
  }
  return after.length;
}

export function formatNumberEdit(
  previous: string, incoming: string, start: number, end: number, decimals: number,
): NumberSelection {
  let normalized = incoming;
  if (decimals > 0 && !incoming.includes(",")) {
    const change = numberTextChange(previous, incoming);
    if (change.inserted === ".") {
      // A newly typed dot is decimal, even beside existing program-generated grouping dots.
      const dot = start === end && incoming[start - 1] === "." ? start - 1 : change.start;
      normalized = incoming.slice(0, dot) + "," + incoming.slice(dot + 1);
    } else if (change.inserted.length > 1 && change.inserted.includes(".")) {
      // Pasted valid thousand groups stay groups; other final dot groups are decimal.
      if (!/^-?\d{1,3}(\.\d{3})+$/.test(incoming)) {
        const dot = incoming.lastIndexOf(".");
        normalized = incoming.slice(0, dot) + "," + incoming.slice(dot + 1);
      }
    }
  }
  const text = groupNumberText(normalized, decimals);
  const source = decimals === 0 ? normalized.replace(/[.,]/g, "") : normalized;
  const offset = (position: number) => decimals === 0
    ? normalized.slice(0, position).replace(/[.,]/g, "").length : position;
  return { text, start: groupedNumberCaret(source, text, offset(start)), end: groupedNumberCaret(source, text, offset(end)) };
}

/** Delete an adjacent digit together with a group separator, avoiding an endless reinserted dot. */
export function deleteNumberGroup(text: string, start: number, end: number, key: string): NumberSelection | null {
  if (start !== end) return null;
  if (key === "Backspace" && text[start - 1] === ".") {
    const from = Math.max(0, start - 2);
    return { text: text.slice(0, from) + text.slice(start), start: from, end: from };
  }
  if (key === "Delete" && text[start] === ".") {
    return { text: text.slice(0, start) + text.slice(start + 2), start, end: start };
  }
  return null;
}
