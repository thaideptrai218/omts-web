import { buildCodewords, pickVersion } from "./qr-code-codewords";

/**
 * Ma trận module của mã QR (true = ô tối) cho một chuỗi ASCII, mức sửa lỗi M. Trả undefined khi chuỗi quá dài
 * (phiên bản > 10): giao diện khi đó chỉ hiện thông tin chuyển khoản bằng chữ.
 */
export function encodeQrMatrix(text: string): boolean[][] | undefined {
  const bytes = new TextEncoder().encode(text), version = pickVersion(bytes.length);
  if (!version || !bytes.length) return undefined;
  const size = version * 4 + 17, modules = grid(size), reserved = grid(size);
  const setFn = (x: number, y: number, dark: boolean) => { if (x >= 0 && y >= 0 && x < size && y < size) { modules[y][x] = dark; reserved[y][x] = true; } };
  drawPatterns(setFn, size, version);
  drawFormat(setFn, size, 0, true); // giữ chỗ để không bị ghi đè bởi dữ liệu
  placeCodewords(modules, reserved, buildCodewords(bytes, version));

  let best = 0, bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const trial = modules.map((row) => row.slice());
    applyMask(trial, reserved, mask);
    drawFormat((x, y, dark) => { trial[y][x] = dark; }, size, mask, false); // chấm điểm cả bit định dạng như bản cuối
    const score = penalty(trial);
    if (score < bestScore) { best = mask; bestScore = score; }
  }
  applyMask(modules, reserved, best);
  drawFormat(setFn, size, best, false);
  return modules;
}

const grid = (size: number) => Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
type SetFn = (x: number, y: number, dark: boolean) => void;
const bit = (value: number, i: number) => ((value >>> i) & 1) !== 0;

function alignmentPositions(version: number, size: number): number[] {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2, step = Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2, result = [6];
  for (let pos = size - 7; result.length < count; pos -= step) result.splice(1, 0, pos);
  return result;
}

function drawPatterns(setFn: SetFn, size: number, version: number) {
  for (let i = 0; i < size; i++) { setFn(6, i, i % 2 === 0); setFn(i, 6, i % 2 === 0); }
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)); setFn(cx + dx, cy + dy, d !== 2 && d !== 4); }
  }
  const pos = alignmentPositions(version, size);
  pos.forEach((cy, i) => pos.forEach((cx, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === pos.length - 1) || (i === pos.length - 1 && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setFn(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));
  drawVersion(setFn, size, version);
}

/** 15 bit định dạng (mức M = 00, mặt nạ 3 bit, BCH(15,5), XOR 0x5412). Xuất để kiểm thử với giá trị chuẩn. */
export function formatBits(mask: number): number {
  const data = mask; // mức sửa lỗi M có mã 00
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}
function drawFormat(setFn: SetFn, size: number, mask: number, blank: boolean) {
  const bits = blank ? 0 : formatBits(mask), at = (i: number) => bit(bits, i);
  for (let i = 0; i <= 5; i++) setFn(8, i, at(i));
  setFn(8, 7, at(6)); setFn(8, 8, at(7)); setFn(7, 8, at(8));
  for (let i = 9; i < 15; i++) setFn(14 - i, 8, at(i));
  for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, at(i));
  for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, at(i));
  setFn(8, size - 8, true);
}
function drawVersion(setFn: SetFn, size: number, version: number) {
  if (version < 7) return;
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  const bits = (version << 12) | rem;
  for (let i = 0; i < 18; i++) { const a = size - 11 + (i % 3), b = Math.floor(i / 3); setFn(a, b, bit(bits, i)); setFn(b, a, bit(bits, i)); }
}

function placeCodewords(modules: boolean[][], reserved: boolean[][], codewords: number[]) {
  const size = modules.length;
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j, y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
      if (!reserved[y][x] && i < codewords.length * 8) { modules[y][x] = bit(codewords[i >>> 3], 7 - (i & 7)); i++; }
    }
  }
}

const masks: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0, (_, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];
function applyMask(modules: boolean[][], reserved: boolean[][], mask: number) {
  modules.forEach((row, y) => row.forEach((_, x) => { if (!reserved[y][x] && masks[mask](x, y)) row[x] = !row[x]; }));
}

/** Điểm phạt theo ISO 18004 (dải cùng màu, khối 2x2, mẫu giống ô định vị, cân bằng sáng tối): càng thấp càng dễ quét. */
function penalty(m: boolean[][]): number {
  const size = m.length, lines: boolean[][] = [...m, ...m.map((_, x) => m.map((row) => row[x]))];
  let score = 0, dark = 0;
  const finderLike = (line: boolean[], at: number, pattern: readonly number[]) => pattern.every((v, k) => line[at + k] === (v === 1));
  const a = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], b = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
  for (const line of lines) {
    let run = 1;
    for (let i = 1; i <= size; i++) {
      if (i < size && line[i] === line[i - 1]) run++;
      else { if (run >= 5) score += run - 2; run = 1; }
    }
    for (let i = 0; i + 11 <= size; i++) if (finderLike(line, i, a) || finderLike(line, i, b)) score += 40;
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (m[y][x]) dark++;
    if (x + 1 < size && y + 1 < size && m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) score += 3;
  }
  return score + Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
}
