/** Pure helpers for the map location picker: draft strings <-> numbers, keyboard nudging and the read-only caption. */
export type PickerPoint = { latitude: number; longitude: number };
/** A pin shown only for orientation (the zone, or the other rafts of that zone). */
export type ContextPin = PickerPoint & { id: string; label: string; kind: "zone" | "raft" };

/** Keyboard step in degrees: about 11 m per press, ten times that with Shift. */
export const NUDGE_STEP = 0.0001;
const round = (value: number) => Number(value.toFixed(6));
const clamp = (value: number, limit: number) => Math.min(limit, Math.max(-limit, value));

/** Drafts hold text; a point exists only when both fields are finite numbers inside the valid ranges. */
export function pointOfDraft(latitude: string, longitude: string): PickerPoint | undefined {
  if (!latitude.trim() || !longitude.trim()) return undefined;
  const lat = Number(latitude.trim().replace(",", ".")), lng = Number(longitude.trim().replace(",", "."));
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { latitude: lat, longitude: lng } : undefined;
}
export const draftOfPoint = (point: PickerPoint): { latitude: string; longitude: string } => ({ latitude: String(round(point.latitude)), longitude: String(round(point.longitude)) });
export const describePoint = (point: PickerPoint) => `Vĩ độ ${round(point.latitude)} · Kinh độ ${round(point.longitude)}`;
export const nudgePoint = (point: PickerPoint, northSteps: number, eastSteps: number): PickerPoint => ({
  latitude: round(clamp(point.latitude + northSteps * NUDGE_STEP, 90)), longitude: round(clamp(point.longitude + eastSteps * NUDGE_STEP, 180)),
});
/** Arrow keys move the marker; Shift multiplies the step. Other keys return undefined. */
export function nudgeOfKey(key: string, shift: boolean): [number, number] | undefined {
  const factor = shift ? 10 : 1;
  switch (key) {
    case "ArrowUp": return [factor, 0];
    case "ArrowDown": return [-factor, 0];
    case "ArrowRight": return [0, factor];
    case "ArrowLeft": return [0, -factor];
    default: return undefined;
  }
}
/** Pins from API rows; rows without usable coordinates are left out. */
export function pinsOf(kind: ContextPin["kind"], rows: readonly { id: string; code: string; latitude?: number | null; longitude?: number | null }[], skipId?: string): ContextPin[] {
  return rows.flatMap(row => row.id !== skipId && typeof row.latitude === "number" && typeof row.longitude === "number" && Number.isFinite(row.latitude) && Number.isFinite(row.longitude) && Math.abs(row.latitude) <= 90 && Math.abs(row.longitude) <= 180
    ? [{ id: row.id, label: kind === "zone" ? `Vùng ${row.code}` : `Bè ${row.code}`, kind, latitude: row.latitude, longitude: row.longitude }] : []);
}
