import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import RedeemForm from "@/components/RedeemForm";
import SkillManageButtons from "@/components/SkillManageButtons";
import Markdown from "@/components/Markdown";

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

export default async function AccountPage() {
  const user = await getUser();
  if (!user) redirect("/login");

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

      <div className="card">
        <h2 className="mb-3 font-semibold text-slate-900">充值积分</h2>
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { credits: 100, price: "¥9.9" },
            { credits: 300, price: "¥25" },
            { credits: 600, price: "¥45" },
            { credits: 1500, price: "¥99" },
          ].map((p) => (
            <div key={p.credits} className="rounded-lg border border-slate-200 p-3 text-center">
              <p className="text-lg font-bold text-amber-600">{p.credits}</p>
              <p className="text-xs text-slate-400">积分</p>
              <p className="mt-1 text-sm font-medium text-slate-700">{p.price}</p>
            </div>
          ))}
        </div>
        <RedeemForm />
        <p className="mt-3 text-xs text-slate-500">
          在线支付接入中。当前请通过
          <b className="text-slate-700"> {supportContact} </b>
          联系客服购买卡密，兑换即时到账。
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
