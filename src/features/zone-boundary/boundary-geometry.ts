import type { BoundaryPosition, ZoneBoundary } from "./boundary-contract";
import { gridToVn2000, vn2000ToGrid, vn2000ToWgs84, wgs84ToVn2000, type Coordinates } from "./vn2000";

/** Same limits the backend applies when a boundary is saved. */
export const MAX_AREAS = 10;
export const MIN_CORNERS = 3;
export const MAX_CORNERS = 100;
export const MAX_AREA_NAME = 100;
export const MAX_CORNER_LABEL = 20;
/** A corner on or within this distance of an edge still counts as inside (phone GPS is off by a few metres). */
const EDGE_TOLERANCE_M = 1;

/** One corner row of the review table. The cells keep the text the user typed. */
export type CornerDraft = { key: string; label: string; x: string; y: string };
/** One khu: `writtenAreaHa` is the area printed above its corner table, when the server read it. */
export type AreaDraft = { key: string; name: string; writtenAreaHa: number | null; corners: CornerDraft[] };

let nextKey = 0;
const key = () => `b${(nextKey += 1)}`;

const inVietnam = (point: Coordinates) => point.latitude >= 8 && point.latitude <= 24.5 && point.longitude >= 102 && point.longitude <= 110;

/** `2315876.23`, `2315876,23` and `2.315.876,23` all read as 2315876.23; anything else is null. */
export function parseGridNumber(text: string): number | null {
  let normalized = text.trim().replace(/\s/g, "");
  if (normalized.includes(",")) normalized = normalized.replace(/\./g, "").replace(",", ".");
  return /^\d+(?:\.\d+)?$/.test(normalized) ? Number(normalized) : null;
}

export function emptyCorner(label = ""): CornerDraft {
  return { key: key(), label, x: "", y: "" };
}
export function cornerDraft(label: string, x: number | null, y: number | null): CornerDraft {
  return { key: key(), label, x: x === null ? "" : x.toFixed(2), y: y === null ? "" : y.toFixed(2) };
}
export function areaDraft(name: string, corners: CornerDraft[], writtenAreaHa: number | null = null): AreaDraft {
  return { key: key(), name, writtenAreaHa, corners };
}

export type CornerCheck = {
  /** `missing`: X or Y is empty or not a number; `outside`: the point is not in Vietnam. */
  state: "ok" | "missing" | "outside";
  /** WGS84 position used to draw the boundary; null unless `ok`. */
  position: Coordinates | null;
};

/** X, Y (VN-2000 grid metres) to WGS84. */
export function checkCorner(corner: CornerDraft, centralMeridian: number): CornerCheck {
  const x = parseGridNumber(corner.x), y = parseGridNumber(corner.y);
  if (x === null || y === null) return { state: "missing", position: null };
  const vn2000 = gridToVn2000(x, y, centralMeridian);
  if (!Number.isFinite(vn2000.latitude) || !Number.isFinite(vn2000.longitude) || !inVietnam(vn2000)) return { state: "outside", position: null };
  return { state: "ok", position: vn2000ToWgs84(vn2000) };
}

/** The usable WGS84 points of a khu, in the order of the paper table. */
export function areaPositions(area: AreaDraft, centralMeridian: number): { label: string; position: Coordinates }[] {
  return area.corners.reduce<{ label: string; position: Coordinates }[]>((result, corner) => {
    const { position } = checkCorner(corner, centralMeridian);
    if (position) result.push({ label: corner.label.trim(), position });
    return result;
  }, []);
}

const round6 = (value: number) => Math.round(value * 1e6) / 1e6;

/** GeoJSON of the khu that have at least 3 usable corners; null when no khu can be drawn. */
export function boundaryOf(areas: readonly AreaDraft[], centralMeridian: number): ZoneBoundary | null {
  const features = areas.reduce<ZoneBoundary["features"]>((result, area) => {
    const corners = areaPositions(area, centralMeridian);
    if (corners.length < MIN_CORNERS) return result;
    const ring: BoundaryPosition[] = corners.map(({ position }) => [round6(position.longitude), round6(position.latitude)]);
    ring.push(ring[0]);
    result.push({
      type: "Feature",
      properties: { name: area.name.trim() || null, corners: corners.map(({ label }, index) => label || `Điểm ${index + 1}`) },
      geometry: { type: "Polygon", coordinates: [ring] },
    });
    return result;
  }, []);
  return features.length > 0 ? { type: "FeatureCollection", features } : null;
}

/** A saved boundary back to editable khu: converted back to VN-2000 so the numbers look like the paper map. */
export function draftsOf(boundary: ZoneBoundary | null | undefined, centralMeridian: number): AreaDraft[] {
  return (boundary?.features ?? []).map((feature, index) => {
    const ring = feature.geometry.coordinates[0] ?? [];
    const open = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? ring.slice(0, -1) : ring;
    const labels = feature.properties?.corners ?? [];
    return areaDraft(feature.properties?.name ?? `Khu ${index + 1}`, open.map(([longitude, latitude], corner) => {
      const grid = vn2000ToGrid(wgs84ToVn2000({ latitude, longitude }), centralMeridian);
      return cornerDraft(labels[corner] ?? "", grid.x, grid.y);
    }));
  });
}

/** Flat projection around an origin, in metres; accurate enough for a zone a few km wide. */
function planar(origin: Coordinates) {
  const scale = Math.cos((origin.latitude * Math.PI) / 180);
  return ([longitude, latitude]: BoundaryPosition) => ({ x: (longitude - origin.longitude) * 111320 * scale, y: (latitude - origin.latitude) * 110574 });
}
type Flat = { x: number; y: number };

function segmentDistance(p: Flat, a: Flat, b: Flat): number {
  const dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function insideRing(point: Coordinates, ring: BoundaryPosition[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > point.latitude !== yj > point.latitude && point.longitude < ((xj - xi) * (point.latitude - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Where a point lies against the boundary: inside any khu (or within 1 m of an edge) and the distance to the nearest edge. Null when there is no boundary. */
export function placementOf(boundary: ZoneBoundary | null | undefined, point: Coordinates): { inside: boolean; distanceM: number } | null {
  const rings = (boundary?.features ?? []).map(feature => feature.geometry.coordinates[0] ?? []).filter(ring => ring.length >= 3);
  if (rings.length === 0) return null;
  const project = planar(point);
  let distanceM = Infinity;
  for (const ring of rings) {
    if (insideRing(point, ring)) return { inside: true, distanceM: 0 };
    const flat = ring.map(project);
    for (let i = 0; i < flat.length; i += 1) distanceM = Math.min(distanceM, segmentDistance({ x: 0, y: 0 }, flat[i], flat[(i + 1) % flat.length]));
  }
  return distanceM <= EDGE_TOLERANCE_M ? { inside: true, distanceM: 0 } : { inside: false, distanceM };
}

/** Area (ha) inside the points taken in order: shoelace on the flat projection. */
export function ringAreaHa(points: Coordinates[]): number {
  if (points.length < 3) return 0;
  const project = planar(points[0]);
  const flat = points.map(point => project([point.longitude, point.latitude]));
  let twice = 0;
  for (let i = 0; i < flat.length; i += 1) {
    const next = flat[(i + 1) % flat.length];
    twice += flat[i].x * next.y - next.x * flat[i].y;
  }
  return Math.abs(twice) / 2 / 10000;
}

/** Total area (ha) of a saved boundary. */
export function boundaryAreaHa(boundary: ZoneBoundary): number {
  return boundary.features.reduce((sum, feature) => sum + ringAreaHa((feature.geometry.coordinates[0] ?? []).slice(0, -1).map(([longitude, latitude]) => ({ latitude, longitude }))), 0);
}

/** Area (ha) of a khu from its X, Y alone (shoelace on the grid, the way the server checks the written area); null under 3 usable corners. */
export function gridAreaHa(area: AreaDraft): number | null {
  const points = area.corners.flatMap(corner => { const x = parseGridNumber(corner.x), y = parseGridNumber(corner.y); return x === null || y === null ? [] : [{ x, y }]; });
  if (points.length < MIN_CORNERS) return null;
  let twice = 0;
  for (let i = 0; i < points.length; i += 1) {
    const next = points[(i + 1) % points.length];
    twice += points[i].x * next.y - next.x * points[i].y;
  }
  return Math.abs(twice) / 2 / 10000;
}

/** The server's rule: the written and the grid area match within 2 % of the written area, at least 0.05 ha. Null when one of them is unknown. */
export function areaMatches(writtenHa: number | null, gridHa: number | null): boolean | null {
  if (writtenHa === null || gridHa === null || writtenHa <= 0) return null;
  return Math.abs(gridHa - writtenHa) <= Math.max(0.02 * writtenHa, 0.05);
}

function crosses(a: Flat, b: Flat, c: Flat, d: Flat): boolean {
  const side = (p: Flat, q: Flat, r: Flat) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  return side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0;
}

/** The outline crosses itself: usually the order of the corners is wrong or one number was misread. */
export function selfIntersects(points: Coordinates[]): boolean {
  if (points.length < 4) return false;
  const project = planar(points[0]);
  const flat = points.map(point => project([point.longitude, point.latitude]));
  const count = flat.length;
  for (let i = 0; i < count; i += 1) {
    for (let j = i + 2; j < count; j += 1) {
      if (i === 0 && j === count - 1) continue;
      if (crosses(flat[i], flat[(i + 1) % count], flat[j], flat[(j + 1) % count])) return true;
    }
  }
  return false;
}

/** A problem found in the draft; `areaKey` / `cornerKey` say where, so the table can mark the row. */
export type BoundaryIssue = { message: string; areaKey?: string; cornerKey?: string };
export type BoundaryReview = { blocking: BoundaryIssue[]; warnings: BoundaryIssue[] };

const areaLabel = (area: AreaDraft) => area.name.trim() || "Khu chưa đặt tên";
const ha = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });

/**
 * What the backend refuses (blocking): too many khu, a khu under 3 or over 100 corners, a corner without valid numbers, two corners in
 * the same place, names over their limit. What only deserves a second look (warnings): written area far from the area of the corners,
 * an outline that crosses itself. An empty list of khu is neither: it means "no boundary".
 */
export function reviewBoundary(areas: readonly AreaDraft[], centralMeridian: number): BoundaryReview {
  const blocking: BoundaryIssue[] = [], warnings: BoundaryIssue[] = [];
  if (areas.length > MAX_AREAS) blocking.push({ message: `Một vùng có tối đa ${MAX_AREAS} khu. Bỏ bớt các khu không thuộc vùng này.` });
  for (const area of areas) {
    const name = areaLabel(area), areaKey = area.key;
    if (area.name.trim().length > MAX_AREA_NAME) blocking.push({ areaKey, message: `${name}: tên khu tối đa ${MAX_AREA_NAME} ký tự.` });
    let usable = 0;
    const seen = new Map<string, string>();
    for (const [index, corner] of area.corners.entries()) {
      const label = corner.label.trim() || String(index + 1), cornerKey = corner.key;
      if (corner.label.trim().length > MAX_CORNER_LABEL) blocking.push({ areaKey, cornerKey, message: `${name}: tên điểm ${label} tối đa ${MAX_CORNER_LABEL} ký tự.` });
      const check = checkCorner(corner, centralMeridian);
      if (!check.position) {
        blocking.push({ areaKey, cornerKey, message: check.state === "outside" ? `${name}: điểm ${label} nằm ngoài lãnh thổ Việt Nam. Kiểm tra X, Y và kinh tuyến trục.` : `${name}: điểm ${label} chưa có X, Y hợp lệ. Sửa hoặc xóa điểm này.` });
        continue;
      }
      usable += 1;
      // The backend rounds to 6 decimals (about 0.1 m) before it compares.
      const spot = `${check.position.latitude.toFixed(6)},${check.position.longitude.toFixed(6)}`, twin = seen.get(spot);
      if (twin !== undefined) blocking.push({ areaKey, cornerKey, message: `${name}: điểm ${label} trùng vị trí với điểm ${twin}. Xóa một trong hai điểm.` });
      else seen.set(spot, label);
    }
    if (area.corners.length < MIN_CORNERS) blocking.push({ areaKey, message: `${name} cần ít nhất ${MIN_CORNERS} điểm góc.` });
    if (area.corners.length > MAX_CORNERS) blocking.push({ areaKey, message: `${name} có quá ${MAX_CORNERS} điểm góc.` });
    if (usable < MIN_CORNERS) continue;
    const grid = gridAreaHa(area);
    if (areaMatches(area.writtenAreaHa, grid) === false) warnings.push({ areaKey, message: `${name}: diện tích tính từ tọa độ (${ha(grid ?? 0)} ha) lệch diện tích ghi trên sơ đồ (${ha(area.writtenAreaHa ?? 0)} ha). Kiểm tra lại các số X, Y.` });
    if (selfIntersects(areaPositions(area, centralMeridian).map(({ position }) => position))) warnings.push({ areaKey, message: `${name}: đường ranh giới tự cắt nhau, thường do sai thứ tự điểm hoặc một số bị đọc sai.` });
  }
  return { blocking, warnings };
}
