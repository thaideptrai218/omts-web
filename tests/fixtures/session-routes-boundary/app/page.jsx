"use client";
import { sessionDestination } from "../../../../src/server/auth/session-destinations";
import { createSessionGateway } from "../../../../src/server/auth/session-gateway";
import { getSessionGateway } from "../../../../src/server/auth/session-gateway.instance";
import { createSessionHttpHandlers } from "../../../../src/server/auth/session-http";
import { requireApplicationPage } from "../../../../src/server/auth/next-session-access";

export default function InvalidSessionRoutesClient() {
  return <p>{sessionDestination("application")}:{typeof createSessionGateway}:{typeof getSessionGateway}:{typeof createSessionHttpHandlers}:{typeof requireApplicationPage}</p>;
}
