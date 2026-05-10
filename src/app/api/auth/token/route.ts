import { NextRequest, NextResponse } from "next/server";
import { getGoals } from "@/lib/insforge";

const INSFORGE_URL = process.env.INSFORGE_URL ?? "";
const INSFORGE_ANON_KEY = process.env.INSFORGE_ANON_KEY ?? "";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 30, // 30 days
  path: "/",
};

export async function POST(req: NextRequest) {
  const { code, codeVerifier } = await req.json();

  if (!code || !codeVerifier) {
    return NextResponse.json({ error: "Missing code or verifier" }, { status: 400 });
  }

  try {
    const tokenRes = await fetch(`${INSFORGE_URL}/api/auth/oauth/exchange`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": INSFORGE_ANON_KEY,
      },
      body: JSON.stringify({ code, code_verifier: codeVerifier }),
    });

    const tokenText = await tokenRes.text();
    if (!tokenRes.ok) {
      console.error("InsForge token exchange error:", tokenText);
      return NextResponse.json({ error: tokenText }, { status: 401 });
    }

    const session = JSON.parse(tokenText);
    console.log("InsForge session keys:", Object.keys(session));

    const accessToken: string =
      session.access_token ?? session.accessToken ?? session.token ?? "";
    const refreshToken: string =
      session.refresh_token ?? session.refreshToken ?? "";
    const userId: string =
      session.user?.id ?? session.userId ?? session.sub ?? "";

    if (!accessToken || !userId) {
      return NextResponse.json(
        { error: `Unexpected session format. Keys: ${Object.keys(session).join(", ")}` },
        { status: 500 }
      );
    }

    const goals = await getGoals(userId, accessToken).catch(() => []);
    const hasGoals = goals.length > 0;

    const res = NextResponse.json({ ok: true, hasGoals });
    res.cookies.set("loop_token", accessToken, COOKIE_OPTS);
    res.cookies.set("loop_user_id", userId, COOKIE_OPTS);
    if (refreshToken) {
      res.cookies.set("loop_refresh_token", refreshToken, COOKIE_OPTS);
    }
    return res;
  } catch (err) {
    console.error("Token route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
