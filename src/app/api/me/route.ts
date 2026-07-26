import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: { email: user.email, credits: user.credits },
  });
}
