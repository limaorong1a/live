import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import type { InputField } from "@/lib/skills";
import RunClient from "./RunClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { slug: string };
  searchParams: { prefill?: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const skill = await prisma.skill.findUnique({ where: { slug: params.slug } });
  if (!skill || !skill.published || skill.reviewStatus !== "approved") {
    return { title: "技能不存在 — 技能中转站" };
  }
  return {
    title: `${skill.name} — 技能中转站`,
    description: skill.description,
  };
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}

export default async function SkillPage({ params, searchParams }: PageProps) {
  const skill = await prisma.skill.findUnique({
    where: { slug: params.slug },
    include: { creator: { select: { email: true } } },
  });
  if (!skill || !skill.published || skill.reviewStatus !== "approved") notFound();

  const fields: InputField[] = JSON.parse(skill.inputs);

  // 「再次使用」：从自己的历史运行记录预填输入
  let initialValues: Record<string, string> | undefined;
  if (searchParams.prefill) {
    const userId = await getUserId();
    if (userId) {
      const run = await prisma.run.findUnique({
        where: { id: searchParams.prefill },
      });
      if (run && run.userId === userId && run.skillId === skill.id) {
        try {
          initialValues = JSON.parse(run.inputs);
        } catch {
          // 忽略损坏的历史输入
        }
      }
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{skill.emoji}</span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{skill.name}</h1>
            <p className="text-sm text-slate-500">{skill.description}</p>
            <p className="mt-0.5 text-xs text-slate-400">
              {skill.creator
                ? `创作者：${maskEmail(skill.creator.email)}`
                : "官方技能"}
              {skill.runsCount > 0 && ` · 已使用 ${skill.runsCount} 次`}
            </p>
          </div>
        </div>
      </div>
      <RunClient
        slug={skill.slug}
        costCredits={skill.costCredits}
        fields={fields}
        initialValues={initialValues}
      />
    </div>
  );
}
