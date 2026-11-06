import { EmployeeManagementExperience } from "@/features/employee-management/components/employee-management-experience";
import { ApiPage } from "@/features/api-workspace/api-page";
import { ApiResourceScreen } from "@/features/api-workspace/api-resource-screen";

// ApiPage selects the data mode after connection(), so this route has no static instant shell.
export const instant = false;

export default function EmployeesPage() {
  return <ApiPage api={<ApiResourceScreen resource="employees" />}><EmployeeManagementExperience /></ApiPage>;
}
