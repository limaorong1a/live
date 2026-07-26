import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { chatStream, UpstreamError, type ChatMessage } from "@/lib/llm";
import { renderTemplate, type InputField } from "@/lib/skills";
import { rateLimit } from "@/lib/ratelimit";
import { checkSensitive } from "@/lib/moderation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USER_FACING_UPSTREAM_ERROR = "AI 服务暂时繁忙，请稍后重试";
const FREE_REFINES = 2; // 每条结果前 N 次追问免费
const REFINE_COST = 1; // 之后每次消耗积分

function sse(data: object) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// 基于已有运行结果，按用户指令进行二次编辑/追问微调
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (!rateLimit(`refine:${user.id}`, 15, 60 * 1000)) {
    return NextResponse.json({ error: "操作太频繁，请稍后再试" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const runId: unknown = body.runId;
  const instruction: unknown = body.instruction;

  if (typeof runId !== "string" || typeof instruction !== "string" || !instruction.trim()) {
    return NextResponse.json({ error: "请输入修改要求" }, { status: 400 });
  }
  if (instruction.length > 2000) {
    return NextResponse.json({ error: "修改要求过长" }, { status: 400 });
  }
  if (checkSensitive(instruction)) {
    return NextResponse.json({ error: "输入内容包含违规信息" }, { status: 400 });
  }

  const run = await prisma.run.findUnique({ where: { id: runId }, include: { skill: true } });
  if (!run || run.userId !== user.id || run.status !== "done") {
    return NextResponse.json({ error: "找不到可修改的结果" }, { status: 404 });
  }

  // 判断本次是否收费
  const willCharge = run.refineCount >= FREE_REFINES;
  if (willCharge) {
    const debit = await prisma.user.updateMany({
      where: { id: user.id, credits: { gte: REFINE_COST } },
      data: { credits: { decrement: REFINE_COST } },
    });
    if (debit.count === 0) {
      return NextResponse.json(
        { error: `积分不足：追问需 ${REFINE_COST} 积分`, needCredits: true },
        { status: 402 }
      );
    }
  }

  const refund = async () => {
    if (willCharge) {
      await prisma.user
        .update({ where: { id: user.id }, data: { credits: { increment: REFINE_COST } } })
        .catch(() => {});
    }
  };

  // 重建多轮对话：原始 user 提问 + 上次 assistant 输出 + 本次修改指令
  const skill = run.skill;
  const fields: InputField[] = JSON.parse(skill.inputs);
  const values: Record<string, string> = {};
  const savedInputs = JSON.parse(run.inputs) as Record<string, string>;
  for (const f of fields) values[f.key] = (savedInputs[f.key] ?? "").trim();

  const messages: ChatMessage[] = [
    { role: "system", content: skill.systemPrompt },
    { role: "user", content: renderTemplate(skill.promptTemplate, values) },
    { role: "assistant", content: run.output },
    { role: "user", content: instruction.trim() },
  ];

  const controller = new AbortController();
  req.signal.addEventListener("abort", () => controller.abort());

  try {
    const upstream = chatStream(skill.model, messages, controller.signal);
    const first = await upstream.next();
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(ctrl) {
        let output = "";
        let clientGone = false;
        let blocked = false;
        const push = (data: object) => {
          if (clientGone) return;
          try {
            ctrl.enqueue(encoder.encode(sse(data)));
          } catch {
            clientGone = true;
          }
        };
        try {
          if (!first.done && first.value) {
            output += first.value;
            push({ delta: first.value });
          }
          for await (const delta of upstream) {
            output += delta;
            push({ delta });
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
          if (blocked) {
            await refund();
            push({ error: "生成内容包含违规信息，已终止", refunded: true });
            return;
          }
          await prisma.run
            .update({ where: { id: run.id }, data: { refineCount: { increment: 1 } } })
            .catch(() => {});
          const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
          push({ done: true, credits: fresh.credits, charged: willCharge ? REFINE_COST : 0 });
        } catch (e) {
          if (e instanceof UpstreamError || (e instanceof Error && e.name !== "AbortError")) {
            console.error("[refine] upstream error:", e instanceof Error ? e.message : e);
            await refund();
            push({ error: USER_FACING_UPSTREAM_ERROR, refunded: willCharge });
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
  } catch (e) {
    console.error("[refine] init error:", e instanceof Error ? e.message : e);
    await refund();
    return NextResponse.json(
      { error: USER_FACING_UPSTREAM_ERROR, refunded: willCharge },
      { status: 502 }
    );
  }
}
