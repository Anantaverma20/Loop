import { NextRequest, NextResponse } from "next/server";

const INSFORGE_URL = process.env.INSFORGE_URL ?? "";
const INSFORGE_ANON_KEY = process.env.INSFORGE_ANON_KEY ?? "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const codeChallenge = searchParams.get("code_challenge") ?? "";
  const method = searchParams.get("code_challenge_method") ?? "S256";

  if (!codeChallenge) {
    return NextResponse.redirect(new URL("/auth", req.url));
  }

  const params = new URLSearchParams({
    redirect_uri: `${APP_URL}/auth/callback`,
    code_challenge: codeChallenge,
    code_challenge_method: method,
  });

  // InsForge returns { authUrl } — it doesn't redirect directly
  const res = await fetch(
    `${INSFORGE_URL}/api/auth/oauth/google?${params}`,
    { headers: { apikey: INSFORGE_ANON_KEY } }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("InsForge OAuth init error:", err);
    return NextResponse.redirect(new URL(`/auth?error=${encodeURIComponent(err)}`, req.url));
  }

  const { authUrl } = await res.json();
  return NextResponse.redirect(authUrl);
}
