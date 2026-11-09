/**
 * Phần "dữ liệu" của mã QR (ISO/IEC 18004, Model 2): chọn phiên bản, tạo mã sửa lỗi Reed-Solomon và xếp xen kẽ các khối.
 * Chỉ hỗ trợ chế độ byte, mức sửa lỗi M, phiên bản 1-10 (đủ cho chuỗi VietQR khoảng 150-200 ký tự).
 * Hàm thuần, không phụ thuộc thư viện ngoài, để giảm rủi ro chuỗi cung ứng cho màn thu tiền.
 */
export const MAX_VERSION = 10;
/** Số byte sửa lỗi mỗi khối và số khối của mức M theo phiên bản (chỉ số 0 không dùng). */
const ECC_PER_BLOCK = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];

/** Tổng số module có thể chứa dữ liệu + sửa lỗi của một phiên bản (trừ mẫu chức năng). */
export function rawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const align = Math.floor(version / 7) + 2;
    result -= (25 * align - 10) * align - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}
const dataCodewords = (version: number) => Math.floor(rawDataModules(version) / 8) - ECC_PER_BLOCK[version] * BLOCKS[version];
const countBits = (version: number) => (version <= 9 ? 8 : 16);

/** Phiên bản nhỏ nhất chứa vừa `byteLength` byte ở chế độ byte, hoặc undefined nếu quá dài. */
export function pickVersion(byteLength: number): number | undefined {
  for (let v = 1; v <= MAX_VERSION; v++) if (4 + countBits(v) + 8 * byteLength <= dataCodewords(v) * 8) return v;
  return undefined;
}

function gfMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}
function divisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}
/** Phần dư của đa thức dữ liệu chia cho đa thức sinh: chính là các byte sửa lỗi. */
export function reedSolomonRemainder(data: readonly number[], degree: number): number[] {
  const gen = divisor(degree), result = new Array<number>(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ (result.shift() as number);
    result.push(0);
    gen.forEach((coefficient, i) => { result[i] ^= gfMultiply(coefficient, factor); });
  }
  return result;
}

/** Chuỗi byte dữ liệu đã đệm: chỉ báo chế độ byte, độ dài, nội dung, kết thúc và byte đệm 0xEC/0x11. */
function dataBytes(bytes: Uint8Array, version: number): number[] {
  const bits: number[] = [];
  const push = (value: number, length: number) => { for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1); };
  push(0b0100, 4); push(bytes.length, countBits(version));
  for (const byte of bytes) push(byte, 8);
  const capacity = dataCodewords(version) * 8;
  push(0, Math.min(4, capacity - bits.length));
  while (bits.length % 8) bits.push(0);
  const out: number[] = [];
  for (let i = 0; i < bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  for (let pad = 0xec; out.length < dataCodewords(version); pad ^= 0xec ^ 0x11) out.push(pad);
  return out;
}

/** Toàn bộ codeword (dữ liệu và sửa lỗi) đã xen kẽ giữa các khối, theo thứ tự đặt vào ma trận. */
export function buildCodewords(bytes: Uint8Array, version: number): number[] {
  const data = dataBytes(bytes, version), blocks = BLOCKS[version], eccLen = ECC_PER_BLOCK[version];
  const raw = Math.floor(rawDataModules(version) / 8), shortBlocks = blocks - (raw % blocks), shortLen = Math.floor(raw / blocks);
  const parts: number[][] = [];
  for (let i = 0, k = 0; i < blocks; i++) {
    const length = shortLen - eccLen + (i < shortBlocks ? 0 : 1), chunk = data.slice(k, k + length);
    k += length;
    const ecc = reedSolomonRemainder(chunk, eccLen);
    if (i < shortBlocks) chunk.push(0);
    parts.push([...chunk, ...ecc]);
  }
  const result: number[] = [];
  for (let i = 0; i < parts[0].length; i++) {
    parts.forEach((block, j) => { if (i !== shortLen - eccLen || j >= shortBlocks) result.push(block[i]); });
  }
  return result;
}
