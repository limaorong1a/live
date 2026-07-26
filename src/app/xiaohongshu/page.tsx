import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "小红书运营工作台 — 起号·选题·生产·过审·复盘一站搞定 | 技能中转站",
  description:
    "小红书博主专属 AI 工作台：起号定位、爆款拆解、文案生成、发布前合规体检（内置违禁词红线库）、数据复盘，一条龙避免限流封号。",
};

// 工作流阶段编排：把 8 个技能按博主真实发布流程分组
const STAGES: { title: string; desc: string; slugs: string[] }[] = [
  {
    title: "① 定位起号",
    desc: "找准差异化人设，不做无效内容",
    slugs: ["xhs-positioning"],
  },
  {
    title: "② 选题挖掘",
    desc: "拆爆款、挖评论，选题不再拍脑袋",
    slugs: ["xhs-competitor", "xhs-comments"],
  },
  {
    title: "③ 内容生产",
    desc: "标题正文一键出，封面图集有脚本",
    slugs: ["xhs-content", "xhs-cover"],
  },
  {
    title: "④ 合规过审（核心）",
    desc: "发布前体检，规避限流封号扣分",
    slugs: ["xhs-compliance", "xhs-ai-label"],
  },
  {
    title: "⑤ 数据复盘",
    desc: "诊断掉量断点，指导下一篇迭代",
    slugs: ["xhs-analytics"],
  },
];

export default async function XiaohongshuHub() {
  const skills = await prisma.skill.findMany({
    where: { category: "小红书运营", published: true, reviewStatus: "approved" },
  });
  const bySlug = new Map(skills.map((s) => [s.slug, s]));

  return (
    <div>
      <section className="mb-8 rounded-2xl bg-gradient-to-br from-rose-50 to-red-50 p-6 text-center sm:p-10">
        <p className="mb-2 text-3xl">📕</p>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          小红书运营工作台
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">
          从起号到复盘，一条龙 AI 工具。2026 最严审核年，
          <b className="text-rose-600">发布前先做合规体检</b>，
          内置随平台更新的违禁词与红线库，帮你远离限流封号。
        </p>
      </section>

      <div className="mb-8 rounded-xl border border-rose-200 bg-white p-4">
        <Link href="/workflows/xhs-oneshot" className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">
              🚀 懒人首选：小红书爆款一条龙
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              填一次主题，自动『生成爆款笔记 → 合规体检』，直接出可发成品
            </p>
          </div>
          <span className="shrink-0 text-rose-600">一键运行 →</span>
        </Link>
      </div>

      <div className="grid gap-8">
        {STAGES.map((stage) => (
          <section key={stage.title}>
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-slate-900">{stage.title}</h2>
              <p className="text-sm text-slate-500">{stage.desc}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stage.slugs.map((slug) => {
                const s = bySlug.get(slug);
                if (!s) return null;
                return (
                  <Link
                    key={slug}
                    href={`/skills/${slug}`}
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
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-slate-400">
        内容由 AI 生成，合规检测基于通用规则，平台规则动态更新，最终以官方审核为准。
      </p>
    </div>
  );
}
