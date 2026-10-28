import type {
  EmployeeAccountSummary,
  EmployeeProfile,
} from "@/features/employee-management/domain/employee-management";
import { mockManagedAccounts } from "@/features/account-management/mocks/account-management-fixtures";
export { mockFarmingZones as mockEmployeeZones } from "@/features/account-management/mocks/account-management-fixtures";

export const mockEmployeeAccounts = mockManagedAccounts
  .filter((account) => account.accountType === "internal")
  .map(
    (account) =>
      ({
        displayName: account.displayName,
        id: account.id,
        phone: account.phone,
        status: account.status,
        username: account.username,
      }) satisfies EmployeeAccountSummary,
  );

function accountById(accountId: string): EmployeeAccountSummary {
  const account = mockEmployeeAccounts.find((item) => item.id === accountId);
  if (!account) throw new Error(`Missing employee account fixture: ${accountId}`);
  return account;
}

export const mockEmployeeProfiles = [
  {
    account: accountById("account-nguyen-an"),
    address: "Thôn Hải Đông, xã Hải Ninh",
    area: "Quảng Bình",
    birthday: "1988-05-14",
    fullName: "Nguyễn Văn An",
    id: "employee-nguyen-an",
    notes: "Phụ trách tổ nuôi khu Đông.",
    otherInformation: "Có chứng chỉ an toàn lao động.",
    phone: "0901234567",
    recordVersion: "bW9jay1lbXBsb3llZS0x",
    status: "employed",
    wardCommune: "Hải Ninh",
    workingZoneIds: ["zone-east"],
    bankAccount: null,
  },
  {
    account: null,
    address: "Thôn Nam Lãnh",
    area: "Quảng Bình",
    birthday: "1993-11-02",
    fullName: "Lê Thị Lan",
    id: "employee-le-lan",
    notes: "",
    otherInformation: "",
    phone: "0914555666",
    recordVersion: "bW9jay1lbXBsb3llZS0y",
    status: "employed",
    wardCommune: "Quảng Phú",
    workingZoneIds: ["zone-south"],
    bankAccount: null,
  },
  {
    account: accountById("account-tran-binh"),
    address: "",
    area: "Quảng Bình",
    birthday: "",
    fullName: "Trần Thị Bình",
    id: "employee-tran-binh",
    notes: "Lịch sử chấm công và tiền công được giữ nguyên.",
    otherInformation: "",
    phone: "0902222333",
    recordVersion: "bW9jay1lbXBsb3llZS0z",
    status: "left",
    wardCommune: "",
    workingZoneIds: [],
    bankAccount: null,
  },
] as const satisfies readonly EmployeeProfile[];
