// Synthetic test data only; never imported by application services/components.
export const employeeId = "b669dc43-c9dc-4df8-930b-ab9de6d978e3";
export const linkedAccountId = "ab03cd89-d7c9-40b9-bb15-908d6abdb840";
export const workingZoneId = "e4cc1e23-71cb-45c7-be03-fb03d4ac8796";

export function employeeListItemFixture() {
  return {
    id: employeeId,
    code: "NV000001",
    fullName: "Nguyễn Văn An",
    phoneNumber: "0900000000",
    employeeType: "Staff",
    jobTypes: [],
    lastWorkingDay: null,
    canMaintain: true,
    rowVersion: "AAAAAAAA+/8=",
    workingZones: [{ id: workingZoneId, code: "V01", name: "Vùng Đông" }],
    account: {
      id: linkedAccountId,
      username: "fixture.an",
      displayName: "Nguyễn An",
      status: "Active",
    },
    status: "Employed",
  };
}

export function employeeDetailFixture() {
  return {
    ...employeeListItemFixture(),
    birthday: "1996-02-29",
    gender: "Male",
    idNumber: "012345678901",
    startDate: "2025-03-01",
    address: "Địa chỉ mẫu",
    area: "Khu vực mẫu",
    ward: "Phường mẫu",
    otherInformation: "Thông tin cần giữ",
    notes: "Ghi chú cần giữ",
    bankAccount: {
      bankName: "Ngân hàng mẫu",
      accountNumber: "000000123456",
      accountHolderName: "NGUYEN VAN AN",
    },
    typeHistory: [{ type: "Staff", effectiveFrom: "2026-01-01" }],
    hasStaffAccount: true,
    rowVersion: "AAAAAAAA+/8=",
  };
}
