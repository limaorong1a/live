import Link from "next/link";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import SkillExplorer, { type SkillCard } from "@/components/SkillExplorer";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const skills = await prisma.skill.findMany({
    where: { published: true, reviewStatus: "approved" },
    orderBy: [{ category: "asc" }, { createdAt: "asc" }],
  });

  // 已登录用户的收藏，置顶展示
  const userId = await getUserId();
  let favoriteSlugs: string[] = [];
  if (userId) {
    const favs = await prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    const favSet = new Set(favs.map((f) => f.skillId));
    favoriteSlugs = skills.filter((s) => favSet.has(s.id)).map((s) => s.slug);
  }

  const cards: SkillCard[] = skills.map((s) => ({
    slug: s.slug,
    name: s.name,
    description: s.description,
    category: s.category,
    emoji: s.emoji,
    costCredits: s.costCredits,
    runsCount: s.runsCount,
    isCommunity: Boolean(s.creatorId),
  }));

  return (
    <div>
      <section className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
          AI 技能，<span className="text-brand-600">一键即用</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-500">
          不用懂提示词，不用 API Key。专业者调好的 AI 工作流，
          你只管填内容、拿结果，按次消耗积分。
        </p>
        <div className="mt-4">
          <Link
            href="/xiaohongshu"
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-rose-500 to-red-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
          >
            📕 小红书博主？点这进专属运营工作台 →
          </Link>
        </div>
        <p className="mt-3 text-sm">
          <Link href="/create" className="text-brand-600 underline">
            我是专业者，想上架自己的技能 →
          </Link>
        </p>
        <div className="mx-auto mt-6 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
          {[
            { step: "①", title: "注册领积分", desc: "免费注册即送 20 体验积分" },
            { step: "②", title: "挑一个技能", desc: "填入你的内容，点开始生成" },
            { step: "③", title: "秒拿结果", desc: "满意就复制走，失败自动退积分" },
          ].map((s) => (
            <div key={s.step} className="card !p-4">
              <p className="text-sm font-semibold text-slate-900">
                {s.step} {s.title}
              </p>
              <p className="mt-1 text-xs text-slate-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <SkillExplorer skills={cards} favoriteSlugs={favoriteSlugs} />
    </div>
  );
}
