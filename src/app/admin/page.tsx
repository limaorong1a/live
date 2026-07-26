import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import ReviewButtons from "./ReviewButtons";
import CodeGenerator from "./CodeGenerator";
import UserManager from "./UserManager";
import OrderManager from "./OrderManager";
import PayoutManager from "./PayoutManager";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/");

  const [userCount, runCount, creditsSpent, pendingSkills, unusedCodes] =
    await Promise.all([
      prisma.user.count(),
      prisma.run.count({ where: { status: "done" } }),
      prisma.run.aggregate({
        where: { status: "done" },
        _sum: { creditsSpent: true },
      }),
      prisma.skill.findMany({
        where: { reviewStatus: "pending" },
        include: { creator: { select: { email: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.redeemCode.count({ where: { usedById: null } }),
    ]);

  return (
    <div className="mx-auto grid max-w-4xl gap-6">
      <h1 className="text-2xl font-bold text-slate-900">管理后台</h1>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "注册用户", value: userCount },
          { label: "成功运行次数", value: runCount },
          { label: "累计消耗积分", value: creditsSpent._sum.creditsSpent ?? 0 },
          { label: "未使用卡密", value: unusedCodes },
        ].map((s) => (
          <div key={s.label} className="card text-center">
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="mt-1 text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold text-slate-900">
          待审核技能（{pendingSkills.length}）
        </h2>
        {pendingSkills.length === 0 ? (
          <p className="text-sm text-slate-400">暂无待审核技能</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pendingSkills.map((s) => (
              <li key={s.id} className="grid gap-2 py-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800">
                    {s.emoji} {s.name}
                    <span className="ml-2 text-xs text-slate-400">
                      {s.category} · {s.costCredits} 积分/次 · 创作者{" "}
                      {s.creator?.email ?? "未知"}
                    </span>
                  </span>
                  <ReviewButtons skillId={s.id} />
                </div>
                <p className="text-sm text-slate-500">{s.description}</p>
                <details className="text-xs text-slate-500">
                  <summary className="cursor-pointer text-brand-600">
                    查看提示词与字段配置
                  </summary>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3">
{`【角色设定】
${s.systemPrompt}

【提示词模板】
${s.promptTemplate}

【输入字段】
${s.inputs}`}
                  </pre>
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold text-slate-900">生成充值卡密</h2>
        <CodeGenerator />
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold text-slate-900">充值订单</h2>
        <OrderManager />
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold text-slate-900">创作者提现</h2>
        <PayoutManager />
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold text-slate-900">用户管理</h2>
        <UserManager />
      </div>
    </div>
  );
}
