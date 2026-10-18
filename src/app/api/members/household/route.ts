import { NextResponse } from "next/server";
import { getSessionMember, getDependents } from "@/lib/server-db";

// 我自己 + 我的小孩（受扶養人）清單，供「幫誰預約」「查看誰的資料」用
export async function GET() {
  const member = await getSessionMember();
  if (!member) return NextResponse.json({ error: "MEMBER_NOT_FOUND" }, { status: 401 });

  const dependents = await getDependents(member.id);
  return NextResponse.json({ self: member, dependents });
}
