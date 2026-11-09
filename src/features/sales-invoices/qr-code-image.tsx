import { useMemo } from "react";
import { encodeQrMatrix } from "./qr-code-matrix";

const QUIET_ZONE = 4;

/** Đường vẽ SVG: mỗi dải ô tối liên tiếp trên một hàng là một hình chữ nhật, giữ SVG nhỏ gọn. */
export function qrSvgPath(matrix: readonly (readonly boolean[])[]): string {
  const parts: string[] = [];
  matrix.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue;
      const start = x;
      while (x + 1 < row.length && row[x + 1]) x++;
      parts.push(`M${start + QUIET_ZONE} ${y + QUIET_ZONE}h${x - start + 1}v1h-${x - start + 1}z`);
    }
  });
  return parts.join("");
}

/**
 * Mã QR vẽ bằng SVG nội tuyến từ chuỗi VietQR (không tải ảnh từ ngoài, không thư viện). Nền trắng và vùng yên tĩnh 4 ô để máy quét ngân hàng đọc được
 * cả khi giao diện tối. Chuỗi quá dài cho bộ mã hóa thì trả null: nơi gọi hiển thị thông tin chuyển khoản bằng chữ.
 */
export function QrCodeImage({ value, label, className }: { value: string; label: string; className?: string }) {
  const drawing = useMemo(() => {
    const matrix = encodeQrMatrix(value);
    return matrix ? { size: matrix.length + QUIET_ZONE * 2, path: qrSvgPath(matrix) } : undefined;
  }, [value]);
  if (!drawing) return null;
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${drawing.size} ${drawing.size}`} shapeRendering="crispEdges" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width={drawing.size} height={drawing.size} fill="#fff" />
      <path d={drawing.path} fill="#000" />
    </svg>
  );
}
