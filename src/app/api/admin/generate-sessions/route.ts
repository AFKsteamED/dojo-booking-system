import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { guardAdmin } from "@/lib/admin-auth";

// 依常規班範本，往後補產生課程場次
export async function POST(req: NextRequest) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { weeks = 8 } = await req.json().catch(() => ({}));
  const supa = getServiceSupabase();
  const { error } = await supa.rpc("generate_sessions", { p_weeks: Number(weeks) });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
