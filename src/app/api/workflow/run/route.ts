import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { chatStream, UpstreamError, type ChatMessage } from "@/lib/llm";
import { renderTemplate, type InputField } from "@/lib/skills";
import { renderStepInputs, type WorkflowStep } from "@/lib/workflow";
import { rateLimit } from "@/lib/ratelimit";
import { moderateInputs, checkSensitive } from "@/lib/moderation";
import { accrueCreatorEarning } from "@/lib/earnings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USER_FACING_UPSTREAM_ERROR = "AI 服务暂时繁忙，请稍后重试（积分已自动退回）";

function sse(data: object) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (!rateLimit(`workflow:${user.id}`, 5, 60 * 1000)) {
    return NextResponse.json({ error: "操作太频繁，请稍后再试" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const slug: unknown = body.slug;
  const rawInputs: Record<string, unknown> =
    body.inputs && typeof body.inputs === "object" ? body.inputs : {};
  if (typeof slug !== "string") {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const workflow = await prisma.workflow.findUnique({ where: { slug } });
  if (!workflow || !workflow.published) {
    return NextResponse.json({ error: "工作流不存在" }, { status: 404 });
  }

  const fields: InputField[] = JSON.parse(workflow.inputs);
  const steps: WorkflowStep[] = JSON.parse(workflow.steps);

  // 校验并清洗输入
  const inputs: Record<string, string> = {};
  for (const f of fields) {
    const v = rawInputs[f.key];
    if (v !== undefined && typeof v !== "string") {
      return NextResponse.json({ error: `「${f.label}」格式不正确` }, { status: 400 });
    }
    const str = typeof v === "string" ? v : "";
    if (f.required && !str.trim()) {
      return NextResponse.json({ error: `请填写「${f.label}」` }, { status: 400 });
    }
    if (str.length > 20000) {
      return NextResponse.json({ error: `「${f.label}」内容过长` }, { status: 400 });
    }
    inputs[f.key] = str;
  }

  const moderationError = moderateInputs(inputs);
  if (moderationError) {
    return NextResponse.json({ error: moderationError }, { status: 400 });
  }

  // 载入每步技能，计算总价
  const skills = await Promise.all(
    steps.map((s) => prisma.skill.findUnique({ where: { slug: s.skillSlug } }))
  );
  for (let i = 0; i < steps.length; i++) {
    const sk = skills[i];
    if (!sk || !sk.published || sk.reviewStatus !== "approved") {
      return NextResponse.json(
        { error: `工作流步骤「${steps[i].title}」暂不可用` },
        { status: 400 }
      );
    }
  }
  const totalCost = skills.reduce((sum, sk) => sum + (sk?.costCredits ?? 0), 0);

  // 原子扣款
  const debit = await prisma.user.updateMany({
    where: { id: user.id, credits: { gte: totalCost } },
    data: { credits: { decrement: totalCost } },
  });
  if (debit.count === 0) {
    return NextResponse.json(
      { error: `积分不足：本工作流需 ${totalCost} 积分，当前余额 ${user.credits}` },
      { status: 402 }
    );
  }

  let run;
  try {
    run = await prisma.workflowRun.create({
      data: {
        userId: user.id,
        workflowId: workflow.id,
        inputs: JSON.stringify(inputs),
        creditsSpent: totalCost,
      },
    });
  } catch (e) {
    await prisma.user
      .update({ where: { id: user.id }, data: { credits: { increment: totalCost } } })
      .catch(() => {});
    console.error("[workflow] create failed:", e);
    return NextResponse.json(
      { error: USER_FACING_UPSTREAM_ERROR, refunded: true },
      { status: 500 }
    );
  }

  const refundFull = async () => {
    await prisma.user
      .update({ where: { id: user.id }, data: { credits: { increment: totalCost } } })
      .catch(() => {});
    await prisma.workflowRun
      .update({ where: { id: run.id }, data: { status: "error", creditsSpent: 0 } })
      .catch(() => {});
  };

  const controller = new AbortController();
  req.signal.addEventListener("abort", () => controller.abort());
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(ctrl) {
      let clientGone = false;
      const push = (data: object) => {
        if (clientGone) return;
        try {
          ctrl.enqueue(encoder.encode(sse(data)));
        } catch {
          clientGone = true;
        }
      };

      const stepOutputs: string[] = [];
      const combined: string[] = [];
      let failed = false;
      let blocked = false;

      try {
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          const skill = skills[i]!;
          push({ stepStart: i, title: step.title, total: steps.length });

          const stepInputs = renderStepInputs(step.inputMap, inputs, stepOutputs);
          const messages: ChatMessage[] = [
            { role: "system", content: skill.systemPrompt },
            { role: "user", content: renderTemplate(skill.promptTemplate, stepInputs) },
          ];

          let output = "";
          const upstream = chatStream(skill.model, messages, controller.signal);
          for await (const delta of upstream) {
            output += delta;
            push({ step: i, delta });
            if (checkSensitive(output)) {
              blocked = true;
              controller.abort();
              break;
            }
            if (clientGone) {
              controller.abort();
              break;
            }
          }
          if (blocked) break;
          if (clientGone) {
            // 客户端断开：保留已完成部分，不退款
            stepOutputs.push(output);
            combined.push(`## ${step.title}\n\n${output}`);
            break;
          }
          stepOutputs.push(output);
          combined.push(`## ${step.title}\n\n${output}`);
          push({ stepDone: i });
        }

        if (blocked) {
          await refundFull();
          await prisma.workflowRun
            .update({ where: { id: run.id }, data: { status: "blocked" } })
            .catch(() => {});
          push({ error: "生成内容包含违规信息，已终止（积分已退回）", refunded: true });
          return;
        }

        // 创作者分成：为工作流中每个创作者技能的作者记一笔收益
        for (let i = 0; i < steps.length && i < stepOutputs.length; i++) {
          const sk = skills[i];
          if (sk?.creatorId) {
            await accrueCreatorEarning(sk.creatorId, sk.id, sk.costCredits);
          }
        }

        const combinedOutput = combined.join("\n\n---\n\n");
        await prisma.$transaction([
          prisma.workflowRun.update({
            where: { id: run.id },
            data: { output: combinedOutput, status: "done" },
          }),
          prisma.workflow.update({
            where: { id: workflow.id },
            data: { runsCount: { increment: 1 } },
          }),
        ]);
        const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
        push({ done: true, credits: fresh.credits, runId: run.id });
      } catch (e) {
        if (e instanceof UpstreamError || (e instanceof Error && e.name !== "AbortError")) {
          console.error("[workflow] upstream error:", e instanceof Error ? e.message : e);
          if (!failed) {
            failed = true;
            await refundFull();
            push({ error: USER_FACING_UPSTREAM_ERROR, refunded: true });
          }
        }
      } finally {
        try {
          ctrl.close();
        } catch {
          // already closed
        }
      }
    },
    cancel() {
      controller.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
