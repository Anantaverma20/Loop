import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteBillById } from "@/lib/insforge";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const jar = cookies();
  const token = jar.get("loop_token")?.value ?? "";
  const userId = jar.get("loop_user_id")?.value ?? "";

  if (!token || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await deleteBillById(params.id, userId, token);
  return NextResponse.json({ ok: true });
}
