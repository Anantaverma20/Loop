import { NextRequest, NextResponse } from "next/server";
import { signUp } from "@/lib/insforge";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  try {
    const data = await signUp(email, password);
    const res = NextResponse.json({ ok: true, user: data.user });
    // Store access token in httpOnly cookie
    if (data.access_token) {
      res.cookies.set("loop_token", data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      res.cookies.set("loop_user_id", data.user?.id ?? "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });
    }
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signup failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
