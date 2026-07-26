import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import type { InputField } from "@/lib/skills";
import RunClient from "./RunClient";

export const dynamic = "force-dynamic";

export default async function SkillPage({ params }: { params: { slug: string } }) {
  const skill = await prisma.skill.findUnique({ where: { slug: params.slug } });
  if (!skill || !skill.published) notFound();

  const fields: InputField[] = JSON.parse(skill.inputs);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{skill.emoji}</span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{skill.name}</h1>
            <p className="text-sm text-slate-500">{skill.description}</p>
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
