// Thin re-export — the error helper was promoted to app/api/v1/agents/_lib
// in PR 5 so fraud + audit routes can share it. Accounting routes that
// imported from here continue to work unchanged.

export { errorResponse, serverError, errorPlainResponse } from "../../_lib/errors";
export type { ErrorCode, ErrorBody } from "../../_lib/errors";
