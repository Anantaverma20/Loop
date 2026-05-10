import { NextRequest, NextResponse } from "next/server";
import { signIn, getGoals } from "@/lib/insforge";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  try {
    const data = await signIn(email, password);
    const userId = data.user?.id ?? "";
    const token = data.access_token ?? "";

    // Check if this user has already set goals
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
    const message = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
