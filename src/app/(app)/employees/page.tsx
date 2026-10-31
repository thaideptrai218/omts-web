import { EmployeeManagementExperience } from "@/features/employee-management/components/employee-management-experience";
import { ApiPage } from "@/features/api-workspace/api-page";
import { ApiResourceScreen } from "@/features/api-workspace/api-resource-screen";

export default function EmployeesPage() {
  return <ApiPage api={<ApiResourceScreen resource="employees" />}><EmployeeManagementExperience /></ApiPage>;
}
