import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import RedeemForm from "@/components/RedeemForm";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  done: "✅ 完成",
  running: "⏳ 进行中",
  error: "❌ 失败(已退款)",
};

export default async function AccountPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const runs = await prisma.run.findMany({
    where: { userId: user.id },
    include: { skill: { select: { name: true, emoji: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

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
        <h2 className="mb-3 font-semibold text-slate-900">卡密充值</h2>
        <RedeemForm />
        <p className="mt-3 text-xs text-slate-400">
          在线支付（微信 / 支付宝）正在接入中，当前请联系管理员购买充值卡密。
        </p>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold text-slate-900">使用记录</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-slate-400">还没有使用记录，去首页试试吧</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {runs.map((r) => (
              <li key={r.id} className="py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-800">
                    {r.skill.emoji} {r.skill.name}
                  </span>
                  <span className="text-slate-400">
                    {statusLabel[r.status] ?? r.status} · {r.creditsSpent} 积分 ·{" "}
                    {r.createdAt.toLocaleString("zh-CN", { hour12: false })}
                  </span>
                </div>
                {r.output && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-brand-600">
                      查看结果
                    </summary>
                    <div className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                      {r.output}
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
