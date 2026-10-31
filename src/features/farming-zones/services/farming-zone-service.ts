import type { FarmingZoneRepository } from "../repositories/farming-zone-repository";
export type FarmingZoneService = FarmingZoneRepository;
export function createFarmingZoneService(
  repository: FarmingZoneRepository,
): FarmingZoneService {
  return {
    load: () => repository.load(),
    save: (input) => repository.save(input),
    changeStatus: (input) => repository.changeStatus(input),
    saveDocument: (input) => repository.saveDocument(input),
    readAttachment: (id) => repository.readAttachment(id),
  };
}
