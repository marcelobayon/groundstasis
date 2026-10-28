import { NextResponse } from "next/server";
import { authenticate, type AuthContext } from "./auth";
import { checkRateLimit, meter } from "./meter";
import { errorBody, ERROR_STATUS, type ApiErrorCode } from "./errors";
import type { ApiScope } from "./keys";

// Shared scaffolding for authenticated, metered, rate-limited read endpoints.
// Each route supplies its scope + a loader; everything else (auth, limit,
// metering, rate-limit headers, error shaping) happens here so the routes stay
// a few lines and behave identically. Handlers throw ApiError for expected
// failures (e.g. not_found); anything else becomes a metered 500.

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function withRateLimit(res: NextResponse, rl: { limit: number; remaining: number }): NextResponse {
  res.headers.set("X-RateLimit-Limit", String(rl.limit));
  res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
  return res;
}

export function methodNotAllowed(): NextResponse {
  return NextResponse.json(errorBody("method_not_allowed", "Method not allowed. See /docs."), {
    status: ERROR_STATUS.method_not_allowed,
  });
}

export async function handleRead(
  request: Request,
  opts: { scope?: ApiScope; operation: string; route: string },
  load: (ctx: AuthContext, request: Request) => Promise<unknown>,
): Promise<NextResponse> {
  const auth = await authenticate(request, opts.scope);
  if (!auth.ok) {
    return NextResponse.json(errorBody(auth.code, auth.message), { status: ERROR_STATUS[auth.code] });
  }

  const rl = await checkRateLimit(auth.ctx.apiKeyId);
  if (!rl.allowed) {
    await meter({
      userId: auth.ctx.userId,
      apiKeyId: auth.ctx.apiKeyId,
      operation: opts.operation,
      outcome: "rate_limited",
      route: opts.route,
      status: 429,
    });
    return withRateLimit(
      NextResponse.json(errorBody("rate_limited", "Rate limit exceeded. Try again shortly."), {
        status: ERROR_STATUS.rate_limited,
      }),
      rl,
    );
  }

  try {
    const data = await load(auth.ctx, request);
    await meter({
      userId: auth.ctx.userId,
      apiKeyId: auth.ctx.apiKeyId,
      operation: opts.operation,
      outcome: "success",
      route: opts.route,
      status: 200,
    });
    return withRateLimit(NextResponse.json(data), rl);
  } catch (err) {
    const code: ApiErrorCode = err instanceof ApiError ? err.code : "server_error";
    const message = err instanceof ApiError ? err.message : "Something went wrong.";
    await meter({
      userId: auth.ctx.userId,
      apiKeyId: auth.ctx.apiKeyId,
      operation: opts.operation,
      outcome: code,
      route: opts.route,
      status: ERROR_STATUS[code],
    });
    return withRateLimit(NextResponse.json(errorBody(code, message), { status: ERROR_STATUS[code] }), rl);
  }
}
