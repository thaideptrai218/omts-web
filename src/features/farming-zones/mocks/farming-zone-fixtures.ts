import { mockFarmingZones } from "@/features/account-management/mocks/account-management-fixtures";
import type { FarmingZone } from "../domain/farming-zone";

// Location samples follow backend DemoFarmingZoneStep; IDs remain frontend
// fixtures and must never be treated as backend IDs or confirmed HTX data.
const samples = [
  {
    latitude: 21.0712,
    longitude: 107.4321,
    area: 12.5,
    location: "Vịnh Ngọc Vừng, Vân Đồn, Quảng Ninh",
  },
  {
    latitude: 21.0834,
    longitude: 107.4518,
    area: 8,
    location: "Vịnh Minh Châu, Vân Đồn, Quảng Ninh",
  },
  {
    latitude: 21.0947,
    longitude: 107.4783,
    area: 5,
    location: "Bãi Sơn Hào, Quan Lạn, Vân Đồn, Quảng Ninh",
  },
];
export const initialFarmingZones: readonly FarmingZone[] = mockFarmingZones.map(
  (zone, index) => ({
    ...samples[index],
    id: zone.id,
    code: `DEMO-0${index + 1}`,
    name: zone.label.replace(" (đã ngừng)", ""),
    status: zone.status,
    waterMeasurementPoint: "Phao tiêu trung tâm vùng",
    recordVersion: `mock-zone-${index + 1}`,
    inUseRaftCodes: [],
  }),
);
