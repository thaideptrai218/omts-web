import "server-only";
import type { MessageCode } from "../../shared/messages/message-catalog";
import type { EmployeeProblemMetadata } from "../../features/employee-management/api/employee-problem-metadata";

// INTERNAL server result: successful login data may contain tokens. Never serialize
// this union directly into a Route Handler/RSC/client prop; W2.2e supplies DTO projection.
export type BackendTransportResult =
  | Readonly<{ status: "success"; httpStatus: number; data: unknown }>
  | Readonly<{ status: "http-error"; httpStatus: number; code?: MessageCode; retryAfterMs?: number; employeeProblem?: EmployeeProblemMetadata }>
  | Readonly<{ status: "disabled" | "invalid-config" | "invalid-request" | "invalid-response" | "timeout" | "unavailable" }>;

// A failed mutation may already have committed upstream. This result is not a
// retry instruction or proof that a write/logout did not happen.
