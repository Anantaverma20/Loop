import { NextRequest, NextResponse } from "next/server";
import { exchangeOAuthSession, getGoals } from "@/lib/insforge";

export async function POST(req: NextRequest) {
  const { accessToken } = await req.json();
  if (!accessToken) {
    return NextResponse.json({ error: "No token" }, { status: 400 });
  }

  try {
    const session = await exchangeOAuthSession(accessToken);
    const userId = session.user?.id ?? "";
    const token = session.access_token ?? accessToken;

    const goals = await getGoals(userId, token).catch(() => []);
    const hasGoals = goals.length > 0;

    const res = NextResponse.json({ ok: true, hasGoals });
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
    const msg = err instanceof Error ? err.message : "Session failed";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
