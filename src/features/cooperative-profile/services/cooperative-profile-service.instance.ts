import type { BankOption, CooperativeProfile } from "@/features/cooperative-profile/domain/cooperative-profile";
import { createMockCooperativeProfileRepository } from "@/features/cooperative-profile/repositories/mock-cooperative-profile-repository";
import { createCooperativeProfileService } from "@/features/cooperative-profile/services/cooperative-profile-service";

const mockBanks: readonly BankOption[] = [
  {
    id: "vcb",
    name: "Ngân hàng TMCP Ngoại thương Việt Nam",
    shortName: "Vietcombank",
  },
  {
    id: "bidv",
    name: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam",
    shortName: "BIDV",
  },
  {
    id: "agribank",
    name: "Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam",
    shortName: "Agribank",
  },
  {
    id: "vietinbank",
    name: "Ngân hàng TMCP Công thương Việt Nam",
    shortName: "VietinBank",
  },
] as const;

const mockInitialProfile: CooperativeProfile = {
  businessActivities: [],
  cooperativeName: "Hợp tác xã nuôi trồng thủy sản Trung Nam",
  email: null,
  legalRepresentative: "",
  officeAddress: "",
  phone: "",
  receivingBankAccount: {
    accountHolder: "",
    accountNumber: "",
    bankId: "",
  },
  recordVersion: "cooperative-v1",
  status: "preliminary",
  taxId: "",
  website: null,
};

const mockCooperativeProfileRepository = createMockCooperativeProfileRepository({
  banks: mockBanks,
  duplicateTaxIds: ["5709999999"],
  initialProfile: mockInitialProfile,
});

export const cooperativeProfileService = createCooperativeProfileService(
  mockCooperativeProfileRepository,
);
