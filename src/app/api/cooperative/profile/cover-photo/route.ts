import { handleCooperativeRequest } from "@/server/workspace/cooperative-http";
export const GET = (request: Request) => handleCooperativeRequest(request, "cover-photo");
export const POST = GET;
export const DELETE = GET;
