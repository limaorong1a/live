import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { chatStream, type ChatMessage } from "@/lib/llm";
import { renderTemplate, type InputField } from "@/lib/skills";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sse(data: object) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const slug: unknown = body.slug;
  const inputs: Record<string, string> =
    body.inputs && typeof body.inputs === "object" ? body.inputs : {};

  if (typeof slug !== "string") {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const skill = await prisma.skill.findUnique({ where: { slug } });
  if (!skill || !skill.published) {
    return NextResponse.json({ error: "技能不存在" }, { status: 404 });
  }

  const fields: InputField[] = JSON.parse(skill.inputs);
  for (const f of fields) {
    const v = inputs[f.key];
    if (f.required && (typeof v !== "string" || !v.trim())) {
      return NextResponse.json({ error: `请填写「${f.label}」` }, { status: 400 });
    }
    if (typeof v === "string" && v.length > 20000) {
      return NextResponse.json(
        { error: `「${f.label}」内容过长（最多 2 万字）` },
        { status: 400 }
      );
    }
  }

  if (user.credits < skill.costCredits) {
    return NextResponse.json(
      { error: `积分不足：本技能需 ${skill.costCredits} 积分，当前余额 ${user.credits}` },
      { status: 402 }
    );
  }

  // 预扣积分并落库一条运行记录；失败时全额退款
  await prisma.user.update({
    where: { id: user.id },
    data: { credits: { decrement: skill.costCredits } },
  });
  const run = await prisma.run.create({
    data: {
      userId: user.id,
      skillId: skill.id,
      inputs: JSON.stringify(inputs),
      creditsSpent: skill.costCredits,
    },
  });

  const refund = async () => {
    await prisma.user.update({
      where: { id: user.id },
      data: { credits: { increment: skill.costCredits } },
    });
    await prisma.run.update({
      where: { id: run.id },
      data: { status: "error", creditsSpent: 0 },
    });
  };

  const values: Record<string, string> = {};
  for (const f of fields) values[f.key] = (inputs[f.key] ?? "").trim();
  const messages: ChatMessage[] = [
    { role: "system", content: skill.systemPrompt },
    { role: "user", content: renderTemplate(skill.promptTemplate, values) },
  ];

  let upstream: AsyncGenerator<string>;
  try {
    upstream = chatStream(skill.model, messages);
    // 提前拉取第一段，确保上游连接成功后再向客户端返回 200
    const first = await upstream.next();
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let output = "";
        try {
          if (!first.done && first.value) {
            output += first.value;
            controller.enqueue(encoder.encode(sse({ delta: first.value })));
          }
          for await (const delta of upstream) {
            output += delta;
            controller.enqueue(encoder.encode(sse({ delta })));
          }
          const [, updatedUser] = await prisma.$transaction([
            prisma.run.update({
              where: { id: run.id },
              data: { output, status: "done" },
            }),
            prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
            prisma.skill.update({
              where: { id: skill.id },
              data: { runsCount: { increment: 1 } },
            }),
          ]);
          controller.enqueue(
            encoder.encode(sse({ done: true, credits: updatedUser.credits }))
          );
        } catch (e) {
          await refund().catch(() => {});
          const msg = e instanceof Error ? e.message : "生成中断";
          controller.enqueue(encoder.encode(sse({ error: msg, refunded: true })));
        } finally {
          controller.close();
        }
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
    await refund().catch(() => {});
    const msg = e instanceof Error ? e.message : "模型调用失败";
    return NextResponse.json({ error: msg, refunded: true }, { status: 502 });
  }
}
