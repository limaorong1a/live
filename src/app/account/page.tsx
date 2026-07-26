import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import RedeemForm from "@/components/RedeemForm";
import SkillManageButtons from "@/components/SkillManageButtons";
import Markdown from "@/components/Markdown";
import CheckInCard from "@/components/CheckInCard";
import InviteCard from "@/components/InviteCard";
import RechargeCard from "@/components/RechargeCard";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  done: "✅ 完成",
  running: "⏳ 进行中",
  error: "❌ 失败(已退款)",
  blocked: "🚫 违规拦截(已退款)",
};

// 客服联系方式：部署时用环境变量 NEXT_PUBLIC_SUPPORT_CONTACT 覆盖
const supportContact =
  process.env.NEXT_PUBLIC_SUPPORT_CONTACT || "客服微信：skillrelay";

// 兜底清理：进程崩溃等极端情况下可能残留"进行中"的记录，
// 超过 10 分钟仍未完成的判为失败并退回积分。
async function reconcileStuckRuns(userId: string) {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000);
  const stuck = await prisma.run.findMany({
    where: { userId, status: "running", createdAt: { lt: cutoff } },
  });
  for (const r of stuck) {
    await prisma
      .$transaction([
        prisma.run.update({ where: { id: r.id }, data: { status: "error", creditsSpent: 0 } }),
        prisma.user.update({
          where: { id: userId },
          data: { credits: { increment: r.creditsSpent } },
        }),
      ])
      .catch(() => {});
  }
}

export default async function AccountPage() {
  const current = await getUser();
  if (!current) redirect("/login");

  await reconcileStuckRuns(current.id).catch(() => {});
  // 兜底退款后重新读取余额，保证展示为最新值
  const user = (await getUser()) ?? current;

  const [runs, mySkills] = await Promise.all([
    prisma.run.findMany({
      where: { userId: user.id },
      include: { skill: { select: { name: true, emoji: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.skill.findMany({
      where: { creatorId: user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div className="card">
        <h1 className="mb-1 text-xl font-bold text-slate-900">我的账户</h1>
        <p className="text-sm text-slate-500">{user.email}</p>
        <p className="mt-4 text-3xl font-bold text-amber-600">
          {user.credits}
          <span className="ml-1 text-base font-normal text-slate-500">积分</span>
        </p>
      </div>

      <CheckInCard />

      <InviteCard />

      <RechargeCard />

      <div className="card">
        <h2 className="mb-3 font-semibold text-slate-900">卡密兑换</h2>
        <RedeemForm />
        <p className="mt-3 text-xs text-slate-500">
          有充值卡密可在此兑换，即时到账。如需帮助请联系
          <b className="text-slate-700"> {supportContact}</b>。
        </p>
      </div>

      {mySkills.length > 0 && (
        <div className="card">
          <h2 className="mb-3 font-semibold text-slate-900">我创作的技能</h2>
          <ul className="divide-y divide-slate-100">
            {mySkills.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-3 text-sm">
                <span className="font-medium text-slate-800">
                  {s.emoji} {s.name}
                  <span className="ml-2 text-xs text-slate-400">
                    {s.costCredits} 积分/次 · 已使用 {s.runsCount} 次
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span
                    className={
                      s.reviewStatus === "approved"
                        ? s.published
                          ? "text-green-600"
                          : "text-slate-400"
                        : s.reviewStatus === "pending"
                          ? "text-amber-600"
                          : "text-red-500"
                    }
                  >
                    {s.reviewStatus === "approved"
                      ? s.published
                        ? "✅ 已上架"
                        : "⏸ 已下架"
                      : s.reviewStatus === "pending"
                        ? "⏳ 审核中"
                        : "❌ 未通过"}
                  </span>
                  <SkillManageButtons
                    skillId={s.id}
                    published={s.published}
                    reviewStatus={s.reviewStatus}
                  />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h2 className="mb-3 font-semibold text-slate-900">使用记录</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-slate-400">
            还没有使用记录，
            <Link href="/" className="text-brand-600 underline">
              去首页挑一个技能试试
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {runs.map((r) => (
              <li key={r.id} className="py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-800">
                    {r.skill.emoji} {r.skill.name}
                  </span>
                  <span className="flex items-center gap-3 text-slate-400">
                    <span>
                      {statusLabel[r.status] ?? r.status} · {r.creditsSpent} 积分 ·{" "}
                      {r.createdAt.toLocaleString("zh-CN", { hour12: false })}
                    </span>
                    <Link
                      href={`/skills/${r.skill.slug}?prefill=${r.id}`}
                      className="text-brand-600 hover:underline"
                    >
                      再次使用
                    </Link>
                  </span>
                </div>
                {r.output && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-brand-600">
                      查看结果
                    </summary>
                    <div className="mt-2 rounded-lg bg-slate-50 p-3">
                      <Markdown content={r.output} />
                    </div>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
