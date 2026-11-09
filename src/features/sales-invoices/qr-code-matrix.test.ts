import { describe, expect, it } from "vitest";
import { pickVersion, rawDataModules, reedSolomonRemainder } from "./qr-code-codewords";
import { qrSvgPath } from "./qr-code-image";
import { encodeQrMatrix, formatBits } from "./qr-code-matrix";

// Chuỗi VietQR thật từ test của backend (VietQrPayloadQaTests). Mã QR sinh ra từ chúng đã được giải mã lại thành đúng chuỗi bằng bộ giải mã độc lập (jsQR 1.4.0) khi viết bộ mã hóa.
const VECTOR_1 = "00020101021238560010A000000727012600069704360112TESTQA0000010208QRIBFTTA5303704540115802VN62120808HD0000016304AFAB";
const VECTOR_2 = "00020101021238560010A000000727012600069704360112TESTQA0000010208QRIBFTTA53037045408120000005802VN62150811Hau Van Don63044C31";
const fingerprint = (rows: boolean[][]) => {
  let hash = 0x811c9dc5;
  for (const row of rows) for (const dark of row) { hash ^= dark ? 49 : 48; hash = Math.imul(hash, 0x01000193) >>> 0; }
  return hash.toString(16);
};

describe("bộ mã hóa QR", () => {
  it("bit định dạng khớp bảng chuẩn ISO 18004 cho mức M", () => {
    expect(formatBits(0).toString(2).padStart(15, "0")).toBe("101010000010010");
    expect(formatBits(1).toString(2).padStart(15, "0")).toBe("101000100100101");
    expect(formatBits(7).toString(2).padStart(15, "0")).toBe("100101010100000");
  });
  it("số module dữ liệu và phiên bản theo bảng chuẩn", () => {
    expect([1, 2, 7, 10].map(rawDataModules)).toEqual([208, 359, 1568, 2768]);
    expect(pickVersion(14)).toBe(1); expect(pickVersion(15)).toBe(2); expect(pickVersion(114)).toBe(7); expect(pickVersion(213)).toBe(10); expect(pickVersion(214)).toBeUndefined();
  });
  it("mã sửa lỗi Reed-Solomon khớp ví dụ chuẩn (HELLO WORLD, 10 byte sửa lỗi)", () => {
    const data = [0x20, 0x5b, 0x0b, 0x78, 0xd1, 0x72, 0xdc, 0x4d, 0x43, 0x40, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11];
    expect(reedSolomonRemainder(data, 10)).toEqual([0xc4, 0x23, 0x27, 0x77, 0xeb, 0xd7, 0xe7, 0xe2, 0x5d, 0x17]);
  });
  it("sinh ma trận đúng kích thước, có 3 mẫu định vị và đường kẻ thời gian", () => {
    const m = encodeQrMatrix(VECTOR_1)!;
    expect(m.length).toBe(45); // phiên bản 7
    expect(m.every((row) => row.length === 45)).toBe(true);
    for (const [x, y] of [[0, 0], [38, 0], [0, 38]]) { expect(m[y][x]).toBe(true); expect(m[y + 3][x + 3]).toBe(true); expect(m[y + 1][x + 1]).toBe(false); }
    expect(m[6].slice(8, 37).every((dark, i) => dark === (i % 2 === 0))).toBe(true);
    expect(m[45 - 8][8]).toBe(true); // ô tối cố định
  });
  it("ổn định: cùng chuỗi cho cùng ma trận (đã giải mã lại được bằng jsQR)", () => {
    expect(fingerprint(encodeQrMatrix(VECTOR_1)!)).toBe("4dbd6e7f");
    expect(fingerprint(encodeQrMatrix(VECTOR_2)!)).toBe("23f6a4c9");
    expect(fingerprint(encodeQrMatrix("HELLO")!)).toBe("1d366d69");
  });
  it("chuỗi rỗng hoặc quá dài thì không vẽ", () => {
    expect(encodeQrMatrix("")).toBeUndefined();
    expect(encodeQrMatrix("x".repeat(300))).toBeUndefined();
  });
  it("đường SVG gộp các ô tối liên tiếp và cộng vùng yên tĩnh 4 ô", () => {
    expect(qrSvgPath([[true, true, false], [false, false, true]])).toBe("M4 4h2v1h-2zM6 5h1v1h-1z");
  });
});
