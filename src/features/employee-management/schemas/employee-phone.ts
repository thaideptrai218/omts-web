// Matches backend Common/Validation/PhoneNumbers at develop@953f597.
export function normalizeEmployeePhone(value: string): string | null {
  const compact = value.trim().replace(/[\s.()-]/gu, "");
  const domestic = compact.startsWith("+84")
    ? `0${compact.slice(3)}`
    : compact.startsWith("84") && compact.length === 11 ? `0${compact.slice(2)}` : compact;
  return /^0[0-9]{9}$/u.test(domestic) ? domestic : null;
}
