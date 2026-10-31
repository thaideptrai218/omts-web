export function authenticatedSnapshot() {
  const zoneId = "7847775a-8540-43e6-bfc3-caa12bcda270";
  return {
    status: "authenticated" as const,
    identity: { accountId: "322bb318-a72e-49aa-a8d7-a6169f889007", username: "fixture.user", subjectType: "Staff" as const },
    permissions: {
      access: { permissions: [{ key: "workspace.overview.view" as const, scope: { kind: "zones" as const, zoneIds: [zoneId] } }] },
      functionPermissions: [
        { functionCode: "WORK_ASSIGNMENTS", action: "View" as const, scope: { kind: "zones" as const, zoneIds: [zoneId] }, dataScope: "OwnRecords" as const },
        { functionCode: "WATER_MEASUREMENTS", action: "View" as const, scope: { kind: "zones" as const, zoneIds: [zoneId] }, dataScope: "AssignedZone" as const },
      ],
    },
  };
}
