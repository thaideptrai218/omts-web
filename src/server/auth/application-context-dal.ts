import "server-only";

import { myPermissionsSchema } from "@/features/auth/api/permissions-contract.schema";
import { currentIdentitySchema } from "@/features/auth/api/auth-contract.schemas";
import type { PermissionProjection } from "@/features/access/domain/function-permission";
import type { BrowserIdentityDto } from "../backend/browser-dto";
import { projectIdentityDto, projectPermissionsDto } from "../backend/browser-dto";
import { projectBackendDiagnostic } from "../backend/backend-diagnostic";
import type { BackendRequest } from "../backend/backend-request";
import type { BackendTransportResult } from "../backend/backend-result";
import type { ApplicationSessionGuardResult } from "./application-session-guard";

type BackendRequester = Readonly<{
  request(input: BackendRequest): Promise<BackendTransportResult>;
}>;

export type ApplicationContextDto = Readonly<{
  identity: BrowserIdentityDto;
  permissions: PermissionProjection;
}>;

type ContextEndpoint = "identity" | "permissions";
type BackendDiagnostic = ReturnType<typeof projectBackendDiagnostic>;

export type ApplicationContextResult =
  | Readonly<{ status: "ready"; context: ApplicationContextDto }>
  | Readonly<{ status: "unauthenticated"; clearCookie: boolean }>
  | Readonly<{
      status: "onboarding-required";
      phase: "password-change-required" | "contact-verification-required";
    }>
  | Readonly<{ status: "session-unavailable" }>
  | Readonly<{
      status: "backend-failure";
      endpoint: ContextEndpoint;
      diagnostic: BackendDiagnostic;
    }>
  | Readonly<{
      status: "invalid-data";
      endpoint: ContextEndpoint;
      reason: "invalid-payload" | "account-mismatch" | "subject-mismatch" | "session-mismatch" | "phase-mismatch";
    }>;

async function requestBackend(
  backend: BackendRequester,
  input: BackendRequest,
): Promise<BackendTransportResult> {
  try {
    return await backend.request(input);
  } catch {
    return { status: "unavailable" };
  }
}

function backendFailure(
  endpoint: ContextEndpoint,
  result: BackendTransportResult,
): ApplicationContextResult {
  return Object.freeze({
    status: "backend-failure",
    endpoint,
    diagnostic: projectBackendDiagnostic(endpoint, result),
  });
}

export async function loadApplicationContext(
  sessionResult: ApplicationSessionGuardResult,
  backend: BackendRequester,
): Promise<ApplicationContextResult> {
  if (sessionResult.status === "unauthenticated") return sessionResult;
  if (sessionResult.status === "onboarding-required") return sessionResult;
  if (sessionResult.status === "unavailable") {
    return Object.freeze({ status: "session-unavailable" });
  }

  const accountId = sessionResult.session.identity.accountId;
  const expectedSubject = sessionResult.session.identity.subjectType;
  const accessToken = sessionResult.session.readAccessTokenForBackend();

  const identityResult = await requestBackend(backend, {
    endpoint: "identity",
    accessToken,
  });
  if (identityResult.status !== "success") {
    return backendFailure("identity", identityResult);
  }

  const identity = projectIdentityDto(identityResult.data, accountId);
  if (identity.status !== "projected") {
    return Object.freeze({
      status: "invalid-data",
      endpoint: "identity",
      reason: identity.status === "account-mismatch"
        ? "account-mismatch"
        : "invalid-payload",
    });
  }
  if (identity.dto.subjectType !== expectedSubject) {
    return Object.freeze({
      status: "invalid-data",
      endpoint: "identity",
      reason: "subject-mismatch",
    });
  }
  const identityWire = currentIdentitySchema.safeParse(identityResult.data);
  if (!identityWire.success || identityWire.data.sessionId.toLowerCase()
    !== sessionResult.session.identity.backendSessionId.toLowerCase()) {
    return Object.freeze({ status: "invalid-data", endpoint: "identity", reason: "session-mismatch" });
  }

  const permissionsResult = await requestBackend(backend, {
    endpoint: "permissions",
    accessToken,
  });
  if (permissionsResult.status !== "success") {
    return backendFailure("permissions", permissionsResult);
  }

  const permissionsWire = myPermissionsSchema.safeParse(permissionsResult.data);
  if (!permissionsWire.success) {
    return Object.freeze({
      status: "invalid-data",
      endpoint: "permissions",
      reason: "invalid-payload",
    });
  }
  if (permissionsWire.data.subjectType !== expectedSubject) {
    return Object.freeze({
      status: "invalid-data",
      endpoint: "permissions",
      reason: "subject-mismatch",
    });
  }

  const permissions = projectPermissionsDto(permissionsWire.data, accountId);
  if (permissions.status !== "projected") {
    const reason = permissions.status === "account-mismatch"
      ? "account-mismatch"
      : permissions.status === "gated"
        ? "phase-mismatch"
        : "invalid-payload";
    return Object.freeze({
      status: "invalid-data",
      endpoint: "permissions",
      reason,
    });
  }

  return Object.freeze({
    status: "ready",
    context: Object.freeze({
      identity: identity.dto,
      permissions: permissions.dto,
    }),
  });
}
