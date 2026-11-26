"use client";
import { useMemo, useState } from "react";
import type { ZoneBoundary } from "./boundary-contract";
import { areaDraft, boundaryOf, draftsOf, emptyCorner, MAX_AREAS, MAX_CORNERS, reviewBoundary, type AreaDraft, type BoundaryReview, type CornerDraft } from "./boundary-geometry";
import { mergeAreas, type ReadingDrafts } from "./corner-table";
import { DEFAULT_CENTRAL_MERIDIAN, meridianText, parseDms } from "./vn2000";

const meridianProblem = "Kinh tuyến trục phải từ 102°00' đến 110°00', ví dụ 107°45'.";
const inRange = (value: number | null): value is number => value !== null && value >= 102 && value <= 110;

/**
 * The khu and corner rows being reviewed. Nothing is saved or sent from here. A boundary loaded from the zone is shown as X, Y with the default
 * meridian; until the user changes something, `boundary` stays exactly the loaded one (no re-rounding drift), so an untouched draft is not a change.
 */
export function useBoundaryDraft(initial?: ZoneBoundary | null) {
  const [areas, setAreas] = useState<AreaDraft[]>(() => draftsOf(initial, DEFAULT_CENTRAL_MERIDIAN));
  const [meridian, setMeridian] = useState(DEFAULT_CENTRAL_MERIDIAN), [meridianInput, setMeridianInput] = useState(meridianText(DEFAULT_CENTRAL_MERIDIAN));
  const [touched, setTouched] = useState(false);
  const meridianValid = inRange(parseDms(meridianInput));

  const boundary = useMemo(() => touched ? boundaryOf(areas, meridian) : initial ?? null, [touched, areas, meridian, initial]);
  const review = useMemo<BoundaryReview>(() => {
    const found = reviewBoundary(areas, meridian);
    return meridianValid ? found : { ...found, blocking: [{ message: meridianProblem }, ...found.blocking] };
  }, [areas, meridian, meridianValid]);

  const change = (apply: (current: AreaDraft[]) => AreaDraft[]) => { setTouched(true); setAreas(apply); };
  const updateArea = (areaKey: string, apply: (area: AreaDraft) => AreaDraft) => change(current => current.map(area => area.key === areaKey ? apply(area) : area));
  return {
    areas, meridian, meridianInput, meridianValid, boundary, review, touched,
    canAddArea: areas.length < MAX_AREAS,
    canAddCorner: (area: AreaDraft) => area.corners.length < MAX_CORNERS,
    changeMeridian(text: string) {
      setTouched(true); setMeridianInput(text);
      const value = parseDms(text);
      if (inRange(value)) setMeridian(value);
    },
    /** A new read: khu with the same name get the new corners, the others are added, and the meridian the photo shows replaces the current one. */
    applyReading(reading: ReadingDrafts) {
      if (inRange(reading.centralMeridian)) { setMeridian(reading.centralMeridian); setMeridianInput(meridianText(reading.centralMeridian)); }
      change(current => mergeAreas(current, reading.areas));
    },
    addArea: () => change(current => [...current, areaDraft(`Khu ${current.length + 1}`, [emptyCorner(), emptyCorner(), emptyCorner()])]),
    removeArea: (areaKey: string) => change(current => current.filter(area => area.key !== areaKey)),
    renameArea: (areaKey: string, name: string) => updateArea(areaKey, area => ({ ...area, name })),
    addCorner: (areaKey: string) => updateArea(areaKey, area => ({ ...area, corners: [...area.corners, emptyCorner()] })),
    removeCorner: (areaKey: string, cornerKey: string) => updateArea(areaKey, area => ({ ...area, corners: area.corners.filter(corner => corner.key !== cornerKey) })),
    editCorner: (areaKey: string, cornerKey: string, patch: Partial<Pick<CornerDraft, "label" | "x" | "y">>) =>
      updateArea(areaKey, area => ({ ...area, corners: area.corners.map(corner => corner.key === cornerKey ? { ...corner, ...patch } : corner) })),
  };
}
export type BoundaryDraft = ReturnType<typeof useBoundaryDraft>;
