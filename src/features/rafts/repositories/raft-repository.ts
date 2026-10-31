import type {
  RaftConditionInput,
  RaftConditionResult,
  RaftLoadResult,
  SaveRaftInput,
  RaftMutationResult,
  RaftStatusInput,
} from "../domain/raft";

export type RaftRepository = Readonly<{
  load(): Promise<RaftLoadResult>;
  getCondition(input: RaftConditionInput): Promise<RaftConditionResult>;
  save(input: SaveRaftInput): Promise<RaftMutationResult>;
  changeStatus(input: RaftStatusInput): Promise<RaftMutationResult>;
  savePhoto(input: { id: string; file: File }): Promise<RaftMutationResult>;
  getPhoto(id: string): Promise<Blob | null>;
}>;
