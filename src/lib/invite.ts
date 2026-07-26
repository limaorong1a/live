import { randomBytes } from "crypto";
import { prisma } from "./db";

// 邀请奖励额度
export const INVITE_INVITER_REWARD = 15; // 邀请人获得（被邀请人首次生成后发放）
export const INVITE_INVITEE_REWARD = 10; // 被邀请人首次生成后额外获得

function genCode(): string {
  // 6 位大写字母数字，避开易混字符
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) s += alphabet[bytes[i] % alphabet.length];
  return s;
}

/** 获取用户邀请码，没有则生成并持久化（惰性补全，兼容老用户） */
export async function ensureInviteCode(userId: string, existing: string | null): Promise<string> {
  if (existing) return existing;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = genCode();
    try {
      await prisma.user.update({ where: { id: userId }, data: { inviteCode: code } });
      return code;
    } catch {
      // 唯一约束冲突则重试
    }
  }
  throw new Error("生成邀请码失败");
}

/** 用邀请码查邀请人 userId（无效返回 null） */
export async function resolveInviter(code: string | undefined | null): Promise<string | null> {
  if (!code || typeof code !== "string") return null;
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(normalized)) return null;
  const inviter = await prisma.user.findUnique({ where: { inviteCode: normalized } });
  return inviter?.id ?? null;
}

/**
 * 被邀请人首次成功生成后调用：给双方发奖励，幂等（依赖 firstRunRewarded 标志）。
 * 返回被邀请人本次获得的奖励积分（0 表示不触发）。
 */
export async function maybeRewardInvite(userId: string): Promise<number> {
  // 条件更新占位，保证只发一次
  const claim = await prisma.user.updateMany({
    where: { id: userId, firstRunRewarded: false, invitedById: { not: null } },
    data: { firstRunRewarded: true },
  });
  if (claim.count === 0) return 0;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.invitedById) return 0;

  // 给被邀请人加奖励
  await prisma.user
    .update({ where: { id: userId }, data: { credits: { increment: INVITE_INVITEE_REWARD } } })
    .catch(() => {});
  // 给邀请人加奖励并计数（邀请人可能已注销，忽略失败）
  await prisma.user
    .update({
      where: { id: user.invitedById },
      data: {
        credits: { increment: INVITE_INVITER_REWARD },
        invitedCount: { increment: 1 },
      },
    })
    .catch(() => {});

  return INVITE_INVITEE_REWARD;
}
