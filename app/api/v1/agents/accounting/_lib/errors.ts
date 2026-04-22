// Unified error shape for accounting API routes.
//
// All responses from /api/v1/agents/accounting/* and the accounting cron use
// { error: { code, message, detail? } } where:
//   - code: stable machine-readable identifier (snake_case, versioned contract)
//   - message: human-readable summary safe for client display
//   - detail: optional extra (e.g. which column blocks the transition)
//
// NEVER surface raw exceptions. Catch unknown errors in every handler and wrap
// them via `serverError(err)`. This keeps stack traces out of responses and
// gives the UI a predictable shape to switch on.

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

/** Shorthand for bare-Response (used where we return a plain Response, not
 *  NextResponse — e.g. the download handler which streams binary). */
export function errorPlainResponse(code: ErrorCode, message: string, detail?: unknown): Response {
  const body: ErrorBody = { error: { code, message } };
  if (detail !== undefined) body.error.detail = detail;
  return new Response(JSON.stringify(body), {
    status: HTTP[code],
    headers: { "content-type": "application/json" },
  });
}
