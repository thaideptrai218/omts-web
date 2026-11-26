import { ACCOUNTANT_ROLE, pairZoneLabel, roleLabel, type UserPair } from "./user-account-model";

const chip = "inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-xs leading-5";

/** Role and zones as small chips (list cells and detail): role chip filled, one outlined chip per zone, whole-cooperative roles say so. */
export function UserGrantChips({ pairs, limit = 3 }: { pairs: readonly UserPair[]; limit?: number }) {
  if (!pairs.length) return <span className="text-text-muted">Chưa có vai trò</span>;
  const roles = [...new Set(pairs.map((pair) => pair.role))];
  return <div className="flex flex-wrap gap-1">{roles.map((role) => {
    const own = pairs.filter((pair) => pair.role === role);
    const zones = role === ACCOUNTANT_ROLE || own.some((pair) => pair.allZones) ? ["Tất cả vùng"] : [...new Set(own.map(pairZoneLabel))];
    return <span key={role} className="contents">
      <span className={`${chip} border-primary bg-primary-soft font-semibold text-primary`}>{roleLabel(role, own[0].roleName)}</span>
      {zones.slice(0, limit).map((zone) => <span key={zone} className={`${chip} border-border-strong text-text`}>{zone}</span>)}
      {zones.length > limit && <span className={`${chip} border-border-strong text-text-muted`} title={zones.slice(limit).join(", ")}>+{zones.length - limit}</span>}
    </span>;
  })}</div>;
}

/**
 * One chip per role in a single line of words, for list cells: "Quản lý vùng: Ngọc Vừng, Minh Châu" or "Kế toán: tất cả vùng".
 * The text wraps (never cut), so a long list of zones stays readable in a narrow column.
 */
export function UserGrantLineChips({ pairs }: { pairs: readonly UserPair[] }) {
  if (!pairs.length) return <span className="text-text-muted">Chưa có vai trò</span>;
  const roles = [...new Set(pairs.map((pair) => pair.role))];
  return <div className="flex flex-col items-start gap-1">{roles.map((role) => {
    const own = pairs.filter((pair) => pair.role === role);
    const zones = role === ACCOUNTANT_ROLE || own.some((pair) => pair.allZones) ? "tất cả vùng" : [...new Set(own.map(pairZoneLabel))].join(", ");
    return <span key={role} className={`${chip} border-primary bg-primary-soft text-primary`} style={{ whiteSpace: "normal", overflowWrap: "anywhere" }}><strong className="font-semibold">{roleLabel(role, own[0].roleName)}</strong>: {zones}</span>;
  })}</div>;
}
