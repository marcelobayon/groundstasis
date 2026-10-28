// Stable, machine-readable API v1 error contract. PURE (no Next import) so it is
// testable and reusable; routes wrap `errorBody` in NextResponse.json with the
// matching status. Never put stack traces, provider credentials, or secrets in
// a message.

export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "invalid_request"
  | "not_found"
  | "rate_limited"
  | "quota_exceeded"
  | "method_not_allowed"
  | "server_error";

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string };
}

export function errorBody(code: ApiErrorCode, message: string): ApiErrorBody {
  return { error: { code, message } };
}

export const ERROR_STATUS: Record<ApiErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  invalid_request: 400,
  not_found: 404,
  rate_limited: 429,
  quota_exceeded: 402,
  method_not_allowed: 405,
  server_error: 500,
};
