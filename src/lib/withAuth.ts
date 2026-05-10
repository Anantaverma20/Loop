import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { refreshAccessToken, SessionExpiredError } from "@/lib/insforge";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 30,
  path: "/",
};

export interface AuthContext {
  token: string;
  userId: string;
}

export function getAuth(): AuthContext {
  const jar = cookies();
  return {
    token: jar.get("loop_token")?.value ?? "",
    userId: jar.get("loop_user_id")?.value ?? "",
  };
}

/**
 * Wraps a DB operation. On SessionExpiredError, tries to refresh the token
 * and retry once. If refresh fails, returns a 401 SESSION_EXPIRED response
 * with cleared cookies. Otherwise, sets new token cookies on the response.
 */
export async function withTokenRefresh<T>(
  ctx: AuthContext,
  operation: (token: string) => Promise<T>
): Promise<{ value: T; newToken?: string; newRefreshToken?: string } | { expired: true }> {
  try {
    const value = await operation(ctx.token);
    return { value };
  } catch (err) {
    if (!(err instanceof SessionExpiredError)) throw err;

    // Token expired — try refresh
    const jar = cookies();
    const refreshToken = jar.get("loop_refresh_token")?.value ?? "";

    if (refreshToken) {
      const newSession = await refreshAccessToken(refreshToken);
      if (newSession?.access_token) {
        try {
          const value = await operation(newSession.access_token);
          return {
            value,
            newToken: newSession.access_token,
            newRefreshToken: newSession.refresh_token,
          };
        } catch {
          // Retry also failed
        }
      }
    }

    return { expired: true };
  }
}

/** Builds a NextResponse with auth cookies cleared (for session expiry). */
export function sessionExpiredResponse(): NextResponse {
  const res = NextResponse.json(
    { error: "SESSION_EXPIRED" },
    { status: 401 }
  );
  res.cookies.delete("loop_token");
  res.cookies.delete("loop_user_id");
  res.cookies.delete("loop_refresh_token");
  return res;
}

/** Sets refreshed token cookies on a response. */
export function applyNewTokens(
  res: NextResponse,
  newToken: string,
  newRefreshToken?: string
) {
  res.cookies.set("loop_token", newToken, COOKIE_OPTS);
  if (newRefreshToken) {
    res.cookies.set("loop_refresh_token", newRefreshToken, COOKIE_OPTS);
  }
}
