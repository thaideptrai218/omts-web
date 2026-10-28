import type { RaftRepository } from "../repositories/raft-repository";
export type RaftService = RaftRepository;
export function createRaftService(repository: RaftRepository): RaftService {
  return {
    load: () => repository.load(),
    getCondition: (input) => repository.getCondition(input),
    save: (input) => repository.save(input),
    changeStatus: (input) => repository.changeStatus(input),
    savePhoto: (input) => repository.savePhoto(input),
    getPhoto: (id) => repository.getPhoto(id),
  };
}
