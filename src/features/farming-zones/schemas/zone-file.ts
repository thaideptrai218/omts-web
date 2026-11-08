// Mirrors FileRules.Documents (PDF/JPEG/PNG, 10 MiB per attachment).
export const zoneDocumentFileAccept = ".pdf,.png,.jpg,.jpeg";
export async function isZoneDocumentFile(file: File | null): Promise<boolean> {
  if (!file || file.size === 0 || file.size > 10 * 1024 * 1024) return false;
  if (!["application/pdf", "image/jpeg", "image/png", ""].includes(file.type))
    return false;
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  return (
    (bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46 &&
      bytes[4] === 0x2d) ||
    (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
    (bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a)
  );
}
