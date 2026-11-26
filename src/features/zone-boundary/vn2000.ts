/** A point in decimal degrees. */
export type Coordinates = { latitude: number; longitude: number };

/**
 * Corner coordinates on a sea-area licence map are VN-2000: latitude and longitude (degrees, minutes, seconds) and X (northing),
 * Y (easting) of the 3-degree UTM zone, scale 0.9999, central meridian by province (Quảng Ninh 107°45'). Maps and GPS use
 * WGS84; the two differ by about 200 m, so values are converted with the official 7 parameters and never used as written.
 * Same maths as the mobile app (omts-mobile `vn2000.ts`); keep the test vectors of both in step.
 */

const A = 6378137;
const F = 1 / 298.257223563;
const E2 = F * (2 - F);
const N = F / (2 - F);
const K0 = 0.9999;
const FALSE_EASTING = 500000;

/** Default central meridian: Quảng Ninh (Vân Đồn). */
export const DEFAULT_CENTRAL_MERIDIAN = 107.75;

// Fourth-order Krüger series of the transverse Mercator projection, below 1 mm inside a 3-degree zone.
const RECTIFYING = (A / (1 + N)) * (1 + N ** 2 / 4 + N ** 4 / 64);
const ALPHA = [
  N / 2 - (2 * N ** 2) / 3 + (5 * N ** 3) / 16 + (41 * N ** 4) / 180,
  (13 * N ** 2) / 48 - (3 * N ** 3) / 5 + (557 * N ** 4) / 1440,
  (61 * N ** 3) / 240 - (103 * N ** 4) / 140,
  (49561 * N ** 4) / 161280,
];
const BETA = [
  N / 2 - (2 * N ** 2) / 3 + (37 * N ** 3) / 96 - N ** 4 / 360,
  N ** 2 / 48 + N ** 3 / 15 - (437 * N ** 4) / 1440,
  (17 * N ** 3) / 480 - (37 * N ** 4) / 840,
  (4397 * N ** 4) / 161280,
];
const DELTA = [
  2 * N - (2 * N ** 2) / 3 - 2 * N ** 3 + (116 * N ** 4) / 45,
  (7 * N ** 2) / 3 - (8 * N ** 3) / 5 - (227 * N ** 4) / 45,
  (56 * N ** 3) / 15 - (136 * N ** 4) / 35,
  (4279 * N ** 4) / 630,
];

const RAD = Math.PI / 180;
const ARCSEC = Math.PI / 648000;

/** VN-2000 to WGS84, EPSG "VN-2000 to WGS 84 (2)" (QĐ 05/2007/QĐ-BTNMT), coordinate-frame convention, about 1 m. */
const HELMERT = { tx: -191.90441429, ty: -39.30318279, tz: -111.45032835, rx: -0.00928836 * ARCSEC, ry: 0.01975479 * ARCSEC, rz: -0.00427372 * ARCSEC, s: 0.252906278e-6 };

/** X (northing) and Y (easting) in metres of a VN-2000 latitude/longitude. */
export function vn2000ToGrid(point: Coordinates, centralMeridian: number): { x: number; y: number } {
  const phi = point.latitude * RAD;
  const lambda = (point.longitude - centralMeridian) * RAD;
  const e = Math.sqrt(E2);
  const t = Math.sinh(Math.atanh(Math.sin(phi)) - e * Math.atanh(e * Math.sin(phi)));
  const xi = Math.atan2(t, Math.cos(lambda));
  const eta = Math.atanh(Math.sin(lambda) / Math.sqrt(1 + t * t));
  let north = xi;
  let east = eta;
  ALPHA.forEach((alpha, index) => {
    const j = 2 * (index + 1);
    north += alpha * Math.sin(j * xi) * Math.cosh(j * eta);
    east += alpha * Math.cos(j * xi) * Math.sinh(j * eta);
  });
  return { x: K0 * RECTIFYING * north, y: FALSE_EASTING + K0 * RECTIFYING * east };
}

/** VN-2000 latitude and longitude of a VN-2000 X (northing), Y (easting). */
export function gridToVn2000(x: number, y: number, centralMeridian: number): Coordinates {
  const xi = x / (K0 * RECTIFYING);
  const eta = (y - FALSE_EASTING) / (K0 * RECTIFYING);
  let xiPrime = xi;
  let etaPrime = eta;
  BETA.forEach((beta, index) => {
    const j = 2 * (index + 1);
    xiPrime -= beta * Math.sin(j * xi) * Math.cosh(j * eta);
    etaPrime -= beta * Math.cos(j * xi) * Math.sinh(j * eta);
  });
  const chi = Math.asin(Math.sin(xiPrime) / Math.cosh(etaPrime));
  let phi = chi;
  DELTA.forEach((delta, index) => { phi += delta * Math.sin(2 * (index + 1) * chi); });
  return { latitude: phi / RAD, longitude: centralMeridian + Math.atan2(Math.sinh(etaPrime), Math.cos(xiPrime)) / RAD };
}

function toCartesian(point: Coordinates): [number, number, number] {
  const phi = point.latitude * RAD;
  const lambda = point.longitude * RAD;
  const radius = A / Math.sqrt(1 - E2 * Math.sin(phi) ** 2);
  return [radius * Math.cos(phi) * Math.cos(lambda), radius * Math.cos(phi) * Math.sin(lambda), radius * (1 - E2) * Math.sin(phi)];
}

function toGeodetic([x, y, z]: [number, number, number]): Coordinates {
  const p = Math.hypot(x, y);
  let phi = Math.atan2(z, p * (1 - E2));
  for (let i = 0; i < 6; i += 1) {
    const radius = A / Math.sqrt(1 - E2 * Math.sin(phi) ** 2);
    const height = p / Math.cos(phi) - radius;
    phi = Math.atan2(z, p * (1 - (E2 * radius) / (radius + height)));
  }
  return { latitude: phi / RAD, longitude: Math.atan2(y, x) / RAD };
}

function helmert([x, y, z]: [number, number, number], sign: 1 | -1): [number, number, number] {
  const { tx, ty, tz, rx, ry, rz, s } = HELMERT;
  const k = 1 + sign * s;
  const [r1, r2, r3] = [sign * rx, sign * ry, sign * rz];
  return [k * (x + r3 * y - r2 * z) + sign * tx, k * (-r3 * x + y + r1 * z) + sign * ty, k * (r2 * x - r1 * y + z) + sign * tz];
}

/** VN-2000 point to WGS84 (height taken as 0, sea level). */
export function vn2000ToWgs84(point: Coordinates): Coordinates {
  return toGeodetic(helmert(toCartesian(point), 1));
}

/** Inverse of {@link vn2000ToWgs84}, within 1 mm; shows a saved boundary again with the numbers of the paper map. */
export function wgs84ToVn2000(point: Coordinates): Coordinates {
  return toGeodetic(helmert(toCartesian(point), -1));
}

/** Decimal degrees to `21°07'06.66"` (seconds rounded to 2 places, as printed on the map). */
export function dmsText(value: number): string {
  const sign = value < 0 ? "-" : "";
  const hundredths = Math.round(Math.abs(value) * 360000);
  const degrees = Math.floor(hundredths / 360000);
  const minutes = Math.floor((hundredths % 360000) / 6000);
  const seconds = (hundredths % 6000) / 100;
  return `${sign}${degrees}°${String(minutes).padStart(2, "0")}'${seconds.toFixed(2).padStart(5, "0")}"`;
}

/**
 * Reads `21°07'06.66"`, `21 07 06,66`, `21°07'` or a decimal `21.11851`. Minutes and seconds must be below 60;
 * null when the text cannot be read.
 */
export function parseDms(text: string): number | null {
  const cleaned = text.trim().replace(/[’‘`´′]/g, "'").replace(/[”“″]/g, '"').replace(/''/g, '"').replace(/(\d),(\d)/g, "$1.$2");
  if (!cleaned) return null;
  if (/^[+-]?\d+(?:\.\d+)?$/.test(cleaned)) return Number(cleaned);
  const match = cleaned.match(/^([+-]?)(\d{1,3})\s*[°º˚\s]\s*(\d{1,2})(?:\s*['\s]\s*(\d{1,2}(?:\.\d+)?))?\s*"?\s*'?$/);
  if (!match) return null;
  const [, sign, degrees, minutes, seconds = "0"] = match;
  if (Number(minutes) >= 60 || Number(seconds) >= 60) return null;
  const value = Number(degrees) + Number(minutes) / 60 + Number(seconds) / 3600;
  return sign === "-" ? -value : value;
}

/** Central meridian as shown in the form: `107°45'`. */
export const meridianText = (value: number): string => dmsText(value).replace(/'00\.00"$/, "'");

/** Distance in metres between two X, Y points. */
export function gridDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
