import { prisma } from "./db";

// 创作者分成：用户每消耗 1 积分在某创作者技能上，创作者获得的收益（分）。
// 默认 3 分/积分（可用环境变量覆盖）。官方技能（无 creatorId）不分成。
// 这是平台核心经济参数，正式运营前请结合积分售价与毛利仔细核定。
export const CREATOR_EARN_PER_CREDIT_FEN = Number(
  process.env.CREATOR_EARN_PER_CREDIT_FEN || 3
);

// 提现门槛（分），默认 ¥10
export const PAYOUT_MIN_FEN = Number(process.env.PAYOUT_MIN_FEN || 1000);

/**
 * 给技能创作者记一笔分成收益（幂等性由调用方保证——仅在运行成功时调用一次）。
 * creatorId 为空（官方技能）时不处理。
 */
export async function accrueCreatorEarning(
  creatorId: string | null,
  skillId: string,
  creditsSpent: number
): Promise<void> {
  if (!creatorId || creditsSpent <= 0) return;
  const amountFen = creditsSpent * CREATOR_EARN_PER_CREDIT_FEN;
  if (amountFen <= 0) return;
  await prisma
    .$transaction([
      prisma.creatorEarning.create({ data: { creatorId, skillId, amountFen } }),
      prisma.user.update({
        where: { id: creatorId },
        data: { earningsFen: { increment: amountFen } },
      }),
    ])
    .catch((e) => {
      // 分成失败不应影响用户主流程，仅记录日志
      console.error("[earnings] accrue failed:", e instanceof Error ? e.message : e);
    });
}
