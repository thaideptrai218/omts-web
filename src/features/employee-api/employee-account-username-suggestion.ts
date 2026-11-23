/** Suggested login name from the employee's full name: "Nguyễn Văn An" becomes "nguyen.van.an" (letters, digits and dots, at most 50). */
export function suggestUsername(fullName: string): string {
  const words = fullName.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/gi, "d").toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return words.join(".").slice(0, 50).replace(/\.$/, "");
}
