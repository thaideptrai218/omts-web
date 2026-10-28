export type EmployeeBankAccount = Readonly<{
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
}>;

export type EmployeeZoneOption = Readonly<{
  id: string;
  label: string;
  status: "in-use" | "discontinued";
}>;
