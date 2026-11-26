import type { ZoneMapReading } from "./boundary-contract";
import { areaDraft, cornerDraft, type AreaDraft } from "./boundary-geometry";
import { DEFAULT_CENTRAL_MERIDIAN, parseDms, vn2000ToGrid } from "./vn2000";

const round2 = (value: number) => Math.round(value * 100) / 100;

/** What a read of the licence map gives the form: the khu to review, the central meridian and the two prefill values. */
export type ReadingDrafts = { centralMeridian: number | null; location: string | null; areaHa: number | null; areas: AreaDraft[] };

/**
 * Area to suggest for the zone: the "Diện tích đề nghị" row, else the sum of the areas written above each khu table;
 * null when the paper states none.
 */
export function suggestedAreaHa(writtenTotalAreaHa: number | null, writtenAreaHa: readonly (number | null)[]): number | null {
  if (writtenTotalAreaHa !== null && writtenTotalAreaHa > 0) return round2(writtenTotalAreaHa);
  const written = writtenAreaHa.filter((value): value is number => value !== null && value > 0);
  return written.length > 0 ? round2(written.reduce((sum, value) => sum + value, 0)) : null;
}

/**
 * Server reading to review drafts. X, Y come from the server; when a row has only latitude/longitude as written, X, Y are computed
 * from them so the row can still be edited and checked like the others. A khu without a name is called "Khu N"; khu without any corner are dropped.
 */
export function draftsFromReading(reading: ZoneMapReading): ReadingDrafts {
  const meridian = reading.centralMeridian ?? DEFAULT_CENTRAL_MERIDIAN;
  const areas = reading.zones.flatMap((zone, index) => {
    if (zone.corners.length === 0) return [];
    const corners = zone.corners.map(corner => {
      let { x, y } = corner;
      if (x === null || y === null) {
        const latitude = corner.lat ? parseDms(corner.lat) : null, longitude = corner.lon ? parseDms(corner.lon) : null;
        if (latitude !== null && longitude !== null) ({ x, y } = vn2000ToGrid({ latitude, longitude }, meridian));
      }
      return cornerDraft(corner.label?.trim() ?? "", x, y);
    });
    return [areaDraft(zone.name?.trim() || `Khu ${index + 1}`, corners, zone.writtenAreaHa)];
  });
  return { centralMeridian: reading.centralMeridian, location: reading.location?.trim() || null, areaHa: suggestedAreaHa(reading.writtenTotalAreaHa, reading.zones.map(zone => zone.writtenAreaHa)), areas };
}

/** A new read replaces the corners of a khu with the same name (so a second photo of one table fixes it) and adds the others. */
export function mergeAreas(current: readonly AreaDraft[], incoming: readonly AreaDraft[]): AreaDraft[] {
  const next = [...current];
  for (const area of incoming) {
    const same = next.findIndex(existing => existing.name.trim().toLowerCase() === area.name.trim().toLowerCase());
    if (same >= 0) next[same] = { ...next[same], corners: area.corners, writtenAreaHa: area.writtenAreaHa };
    else next.push(area);
  }
  return next;
}
