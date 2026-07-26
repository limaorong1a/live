import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const skills = await prisma.skill.findMany({
    where: { published: true },
    orderBy: [{ category: "asc" }, { createdAt: "asc" }],
  });

  const categories = Array.from(new Set(skills.map((s) => s.category)));

  return (
    <div>
      <section className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
          AI 技能，<span className="text-brand-600">一键即用</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-500">
          不用懂提示词，不用 API Key。专业者调好的 AI 工作流，
          你只管填内容、拿结果，按次消耗积分。
        </p>
      </section>

      {categories.map((cat) => (
        <section key={cat} className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">{cat}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {skills
              .filter((s) => s.category === cat)
              .map((s) => (
                <Link
                  key={s.slug}
                  href={`/skills/${s.slug}`}
                  className="card transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-2xl">{s.emoji}</span>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {s.costCredits} 积分/次
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900">{s.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                    {s.description}
                  </p>
                  {s.runsCount > 0 && (
                    <p className="mt-2 text-xs text-slate-400">
                      已使用 {s.runsCount} 次
                    </p>
                  )}
                </Link>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
