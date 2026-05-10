import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const INSFORGE_URL = process.env.INSFORGE_URL ?? "";
const INSFORGE_ANON_KEY = process.env.INSFORGE_ANON_KEY ?? "";

function getAuth() {
  const jar = cookies();
  return {
    token: jar.get("loop_token")?.value ?? "",
    userId: jar.get("loop_user_id")?.value ?? "",
  };
}

async function dbPost(table: string, body: unknown, token: string) {
  const res = await fetch(`${INSFORGE_URL}/api/database/records/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "apikey": INSFORGE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`InsForge error (${res.status}): ${text}`);
  return JSON.parse(text);
}

async function dbGet(table: string, query: string, token: string) {
  const res = await fetch(`${INSFORGE_URL}/api/database/records/${table}?${query}`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "apikey": INSFORGE_ANON_KEY,
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`InsForge error (${res.status}): ${text}`);
  return JSON.parse(text);
}

export async function GET() {
  const { token, userId } = getAuth();
  if (!token || !userId) {
    return NextResponse.json({ error: "Unauthorized — not signed in" }, { status: 401 });
  }
  try {
    const data = await dbGet("goals", `user_id=eq.${userId}&limit=1`, token);
    return NextResponse.json(Array.isArray(data) ? data[0] ?? null : data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("GET /api/goals error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { token, userId } = getAuth();
  if (!token || !userId) {
    return NextResponse.json({ error: "Unauthorized — not signed in" }, { status: 401 });
  }

  const { savingsTarget, healthGoals, subscriptions } = await req.json();

  const healthGoalsArray = healthGoals
    .split(/[\n,]+/)
    .map((g: string) => g.trim())
    .filter(Boolean);

  try {
    await dbPost(
      "goals",
      {
        user_id: userId,
        savings_target: savingsTarget,
        health_goals: healthGoalsArray,
        subscriptions,
      },
      token
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("POST /api/goals error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
