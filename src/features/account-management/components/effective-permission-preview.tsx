import type { EffectivePermissionZone } from "@/features/account-management/domain/account-management";
import type { FeatureCatalogItem } from "@/features/role-management/domain/role-management";

export function EffectivePermissionPreview({
  catalog,
  zones,
}: {
  catalog: readonly FeatureCatalogItem[];
  zones: readonly EffectivePermissionZone[];
}) {
  const actionLabels = new Map(
    catalog.flatMap((feature) =>
      feature.supportedActions.map((action) => [action.key, action.label] as const),
    ),
  );

  if (zones.length === 0) {
    return (
      <div className="rounded-card border border-warning/30 bg-warning-soft p-4 text-sm leading-6 text-text">
        Chưa có quyền hiệu lực để xem trước. Hãy thêm ít nhất một cặp vùng và vai trò.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {zones.map((zone, index) => (
        <details
          className="group rounded-card border border-border bg-surface"
          key={zone.zoneId}
          open={index === 0}
        >
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-card px-4 py-3 font-semibold text-text hover:bg-surface-subtle">
            <span className="min-w-0">
              <span className="block truncate">{zone.zoneLabel}</span>
              <span className="mt-1 block text-sm font-normal text-text-muted">
                {zone.roleNames.join(" + ")}
              </span>
            </span>
            <span aria-hidden="true" className="text-xl transition group-open:rotate-45">+</span>
          </summary>
          <div className="border-t border-border px-4 py-3">
            <ul className="space-y-3">
              {zone.permissions.map((permission) => (
                <li className="grid gap-2 sm:grid-cols-[minmax(10rem,1fr)_2fr]" key={permission.featureCode}>
                  <span className="text-sm font-semibold text-text">{permission.featureLabel}</span>
                  <span className="flex flex-wrap gap-2">
                    {permission.actionKeys.map((action) => (
                      <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary-hover" key={action}>
                        {actionLabels.get(action) ?? action}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      ))}
    </div>
  );
}
