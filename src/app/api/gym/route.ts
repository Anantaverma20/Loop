import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { insertGymCheckin, getGymCheckins, getGoals } from "@/lib/insforge";
import { differenceInDays, parseISO } from "date-fns";

function getAuth() {
  const jar = cookies();
  return {
    token: jar.get("loop_token")?.value ?? "",
    userId: jar.get("loop_user_id")?.value ?? "",
  };
}

function calcStreak(dates: string[]): number {
  const sorted = [...dates].sort((a, b) => b.localeCompare(a));
  if (sorted.length === 0) return 0;

  const today = new Date().toISOString().split("T")[0];
  let streak = 0;
  let expected = today;

  for (const d of sorted) {
    if (d === expected) {
      streak++;
      const prev = new Date(expected);
      prev.setDate(prev.getDate() - 1);
      expected = prev.toISOString().split("T")[0];
    } else {
      break;
    }
  }
  return streak;
}

export async function GET() {
  const { token, userId } = getAuth();
  if (!token || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await getGymCheckins(userId, token);
  const checkins = rows.map((r) => r.checkin_date);

  const goals = await getGoals(userId, token).catch(() => []);
  const subs = goals[0]?.subscriptions ?? "";
  const gymMatch = subs.match(/gym[^$\n]*\$?([\d.]+)/i);
  const gymCost = gymMatch ? `$${gymMatch[1]}` : null;

  const sorted = [...checkins].sort((a, b) => b.localeCompare(a));
  const lastVisit = sorted[0] ?? null;
  const daysSinceLast = lastVisit
    ? differenceInDays(new Date(), parseISO(lastVisit))
    : null;

  return NextResponse.json({
    checkins,
    streak: calcStreak(checkins),
    lastVisit,
    daysSinceLast,
    gymCost,
  });
}

export async function POST() {
  const { token, userId } = getAuth();
  if (!token || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await insertGymCheckin(userId, token);
  return NextResponse.json({ ok: true });
}
