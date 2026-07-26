import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { ensureInviteCode, INVITE_INVITER_REWARD, INVITE_INVITEE_REWARD } from "@/lib/invite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const code = await ensureInviteCode(user.id, user.inviteCode);
  return NextResponse.json({
    code,
    invitedCount: user.invitedCount,
    inviterReward: INVITE_INVITER_REWARD,
    inviteeReward: INVITE_INVITEE_REWARD,
  });
}
