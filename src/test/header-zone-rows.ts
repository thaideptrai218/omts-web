/**
 * Rows behind the test double of the header zone chip (see header-zones.tsx). Kept free of React and the zone context so a `vi.mock` factory can import it:
 * `vi.mock("@/features/zones-api/in-use-zones", async () => (await import("@/test/header-zone-rows")).inUseZonesMock)`.
 */
export const headerZoneIds = ["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002", "00000000-0000-4000-8000-000000000003"] as const;
export const headerZones = headerZoneIds.map((id, index) => ({ id, code: `Z${index + 1}`, name: ["Ngọc Vừng", "Minh Châu", "Quan Lạn"][index], statusId: 101, status: "In Use" }));
export const inUseZonesMock = { loadInUseZones: async () => ({ status: "success" as const, data: headerZones }) };
