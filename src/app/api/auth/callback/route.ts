import { NextRequest, NextResponse } from "next/server";
import { exchangeOAuthSession, getGoals } from "@/lib/insforge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // InsForge may pass the token as access_token in query params
  const accessToken =
    searchParams.get("access_token") ??
    searchParams.get("token") ??
    searchParams.get("session_token") ?? "";

  if (!accessToken) {
    // If token is in the URL hash, client-side JS must handle it
    // Redirect to a client page that reads the hash and posts it back
    return NextResponse.redirect(new URL("/auth/callback", req.url));
  }

  try {
    const session = await exchangeOAuthSession(accessToken);
    const userId = session.user?.id ?? "";
    const token = session.access_token ?? accessToken;

    const goals = await getGoals(userId, token).catch(() => []);
    const hasGoals = goals.length > 0;

    const dest = hasGoals ? "/dashboard" : "/onboarding";
    const res = NextResponse.redirect(new URL(dest, req.url));

    res.cookies.set("loop_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });
    res.cookies.set("loop_user_id", userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(new URL("/auth?error=oauth_failed", req.url));
  }
}
