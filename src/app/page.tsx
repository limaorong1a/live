import Link from "next/link";
import { prisma } from "@/lib/db";
import SkillExplorer, { type SkillCard } from "@/components/SkillExplorer";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const skills = await prisma.skill.findMany({
    where: { published: true, reviewStatus: "approved" },
    orderBy: [{ category: "asc" }, { createdAt: "asc" }],
  });

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
        <p className="mt-3 text-sm">
          <Link href="/create" className="text-brand-600 underline">
            我是专业者，想上架自己的技能 →
          </Link>
        </p>
      </section>

      <SkillExplorer skills={cards} />
    </div>
  );
}
