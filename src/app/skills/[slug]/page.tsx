import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import type { InputField } from "@/lib/skills";
import RunClient from "./RunClient";

export const dynamic = "force-dynamic";

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}

export default async function SkillPage({ params }: { params: { slug: string } }) {
  const skill = await prisma.skill.findUnique({
    where: { slug: params.slug },
    include: { creator: { select: { email: true } } },
  });
  if (!skill || !skill.published || skill.reviewStatus !== "approved") notFound();

  const fields: InputField[] = JSON.parse(skill.inputs);

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
      />
    </div>
  );
}
