import type { SettingsSection } from "@/components/layout/header-menu";
import { foldVietnamese } from "@/shared/presentation/fold-text";

/** The key a settings item is selected by: its in-place panel, else its own page. */
export const settingsItemKey = (item: SettingsSection["items"][number]) => item.panel ?? item.href;

/** Search key: lower-cased, accent-insensitive, whitespace-trimmed. */
export const normaliseSettingsQuery = (query: string) => foldVietnamese(query.trim());

type SettingsItem = SettingsSection["items"][number];

/** True when the folded query is in the item's title or one of its synonyms (so "mật khẩu" finds Quản lý người dùng). */
const itemMatches = (item: SettingsItem, term: string) =>
  foldVietnamese(item.label).includes(term) || (item.keywords ?? []).some((keyword) => foldVietnamese(keyword).includes(term));

/** Keeps the items whose title or keywords contain the query (accents ignored) and drops groups left empty; an empty query keeps every non-empty group. */
export function filterSettingsGroups(groups: readonly SettingsSection[], query: string): SettingsSection[] {
  const term = normaliseSettingsQuery(query);
  return groups
    .map((group) => ({ ...group, items: term ? group.items.filter((item) => itemMatches(item, term)) : group.items }))
    .filter((group) => group.items.length);
}

/** Up to `limit` items to offer when a search finds nothing: the first item of each group, so the user is never at a dead end. */
export function suggestSettingsItems(groups: readonly SettingsSection[], limit = 3): SettingsItem[] {
  return groups.map((group) => group.items[0]).filter((item): item is SettingsItem => !!item).slice(0, limit);
}

/**
 * Picks the shown item: `?section=` (item key) wins, then `?group=` (its first item), then the first item.
 * Returns undefined when nothing is visible.
 */
export function pickSettingsItem(groups: readonly SettingsSection[], section: string | null, group: string | null) {
  const all = groups.flatMap((entry) => entry.items);
  return all.find((item) => settingsItemKey(item) === section)
    ?? (group ? groups.find((entry) => entry.key === group)?.items[0] : undefined)
    ?? all[0];
}

/**
 * The item whose own page is `pathname` (the longest href wins, sub-pages included), or undefined for any other page.
 * In-place panels are skipped: they live on `/settings` itself.
 */
export function settingsItemForPath(groups: readonly SettingsSection[], pathname: string): SettingsItem | undefined {
  return groups.flatMap((group) => group.items)
    .filter((item) => !item.panel && (pathname === item.href || pathname.startsWith(`${item.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
