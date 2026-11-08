import type {FunctionPermission} from "@/features/access/domain/function-permission";
export function customerDebtAllowed(identity:{subjectType:string},permissions:readonly FunctionPermission[],action="View") {
 return identity.subjectType==="CooperativeOwner"||identity.subjectType==="Staff"&&permissions.some(permission=>permission.functionCode==="CUSTOMER_DEBTS"&&permission.action===action&&(permission.scope.kind==="all-zones"||permission.scope.zoneIds.length>0));
}
export function invoiceAllowed(identity:{subjectType:string},permissions:readonly FunctionPermission[],zoneId?:string) {
 return identity.subjectType==="CooperativeOwner"||identity.subjectType==="Staff"&&permissions.some(permission=>permission.functionCode==="SALES_INVOICES"&&permission.action==="View"&&permission.dataScope==="AssignedZone"&&(permission.scope.kind==="all-zones"||(zoneId?permission.scope.zoneIds.includes(zoneId):permission.scope.zoneIds.length>0)));
}
