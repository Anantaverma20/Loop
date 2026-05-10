import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { insertBill, getBills } from "@/lib/insforge";

function getAuth() {
  const jar = cookies();
  return {
    token: jar.get("loop_token")?.value ?? "",
    userId: jar.get("loop_user_id")?.value ?? "",
  };
}

export async function GET() {
  const { token, userId } = getAuth();
  if (!token || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const bills = await getBills(userId, token);
  return NextResponse.json(bills);
}

export async function POST(req: NextRequest) {
  const { token, userId } = getAuth();
  if (!token || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, amount, due_date } = await req.json();
  const result = await insertBill({ user_id: userId, name, amount, due_date }, token);
  return NextResponse.json(result[0]);
}
