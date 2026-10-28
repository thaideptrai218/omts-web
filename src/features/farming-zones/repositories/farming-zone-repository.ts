import type {
  SaveZoneDocumentInput,
  SaveZoneInput,
  ZoneLoadResult,
  ZoneMutationResult,
  ZoneUsageStatus,
} from "../domain/farming-zone";

export type FarmingZoneRepository = Readonly<{
  load(): Promise<ZoneLoadResult>;
  save(input: SaveZoneInput): Promise<ZoneMutationResult>;
  changeStatus(
    input: Readonly<{
      id: string;
      recordVersion: string;
      status: ZoneUsageStatus;
    }>,
  ): Promise<ZoneMutationResult>;
  saveDocument(input: SaveZoneDocumentInput): Promise<ZoneMutationResult>;
  readAttachment(documentId: string): Promise<File | null>;
}>;
