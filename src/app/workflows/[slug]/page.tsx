import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import type { InputField } from "@/lib/skills";
import type { WorkflowStep } from "@/lib/workflow";
import WorkflowRunClient from "./WorkflowRunClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const wf = await prisma.workflow.findUnique({ where: { slug: params.slug } });
  if (!wf) return { title: "工作流不存在 — 技能中转站" };
  return { title: `${wf.name} — 一键工作流 | 技能中转站`, description: wf.description };
}

export default async function WorkflowPage({ params }: { params: { slug: string } }) {
  const wf = await prisma.workflow.findUnique({ where: { slug: params.slug } });
  if (!wf || !wf.published) notFound();

  const fields: InputField[] = JSON.parse(wf.inputs);
  const steps: WorkflowStep[] = JSON.parse(wf.steps);

  // 计算总价
  const skills = await prisma.skill.findMany({
    where: { slug: { in: steps.map((s) => s.skillSlug) } },
    select: { slug: true, costCredits: true },
  });
  const costMap = new Map(skills.map((s) => [s.slug, s.costCredits]));
  const totalCost = steps.reduce((sum, s) => sum + (costMap.get(s.skillSlug) ?? 0), 0);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{wf.emoji}</span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {wf.name}
              <span className="ml-2 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-normal text-rose-600">
                一键工作流
              </span>
            </h1>
            <p className="text-sm text-slate-500">{wf.description}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {steps.map((s, i) => (
            <span
              key={i}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
            >
              {i + 1}. {s.title.replace(/^第\d步：/, "")}
              {i < steps.length - 1 && " →"}
            </span>
          ))}
        </div>
      </div>
      <WorkflowRunClient
        slug={wf.slug}
        totalCost={totalCost}
        fields={fields}
        stepCount={steps.length}
      />
    </div>
  );
}
