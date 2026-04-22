// Unified error shape for v1 agents API routes.
//
// All responses from accounting, fraud, and audit routes use
// { error: { code, message, detail? } } where:
//   - code: stable machine-readable identifier (snake_case, versioned contract)
//   - message: human-readable summary safe for client display
//   - detail: optional extra (which column blocks the transition, hints, etc.)
//
// NEVER surface raw exceptions. Wrap unknown errors in every handler via
// `serverError(err)` to keep stack traces out of responses.

import { NextResponse } from "next/server";

export type ErrorCode =
  | "unauthorized"
  | "bad_request"
  | "not_found"
  | "conflict"
  | "gone"
  | "unprocessable"
  | "forbidden"
  | "server_error";

const HTTP: Record<ErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  bad_request: 400,
  not_found: 404,
  conflict: 409,
  gone: 410,
  unprocessable: 422,
  server_error: 500,
};

export interface ErrorBody {
  error: { code: string; message: string; detail?: unknown };
}

export function errorResponse(code: ErrorCode, message: string, detail?: unknown): NextResponse<ErrorBody> {
  const body: ErrorBody = { error: { code, message } };
  if (detail !== undefined) body.error.detail = detail;
  return NextResponse.json(body, { status: HTTP[code] });
}

export function serverError(err: unknown, fallback = "internal_error"): NextResponse<ErrorBody> {
  const message = err instanceof Error ? err.message : String(err);
  return errorResponse("server_error", message || fallback);
}

/** Plain Response variant — used by routes that stream binary/NDJSON (the
 *  audit export + the accounting export download). */
export function errorPlainResponse(code: ErrorCode, message: string, detail?: unknown): Response {
  const body: ErrorBody = { error: { code, message } };
  if (detail !== undefined) body.error.detail = detail;
  return new Response(JSON.stringify(body), {
    status: HTTP[code],
    headers: { "content-type": "application/json" },
  });
}
