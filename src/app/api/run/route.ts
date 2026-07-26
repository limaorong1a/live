import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { chatStream, UpstreamError, type ChatMessage } from "@/lib/llm";
import { renderTemplate, type InputField } from "@/lib/skills";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { moderateInputs, checkSensitive } from "@/lib/moderation";
import { maybeRewardInvite } from "@/lib/invite";
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
  if (!rateLimit(`run:${user.id}`, 10, 60 * 1000)) {
    return NextResponse.json(
      { error: "操作太频繁，请一分钟后再试" },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const slug: unknown = body.slug;
  const inputs: Record<string, unknown> =
    body.inputs && typeof body.inputs === "object" ? body.inputs : {};

  if (typeof slug !== "string") {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const skill = await prisma.skill.findUnique({ where: { slug } });
  if (!skill || !skill.published || skill.reviewStatus !== "approved") {
    return NextResponse.json({ error: "技能不存在或未上架" }, { status: 404 });
  }

  const fields: InputField[] = JSON.parse(skill.inputs);
  const cleanInputs: Record<string, string> = {};
  for (const f of fields) {
    const v = inputs[f.key];
    if (v !== undefined && typeof v !== "string") {
      return NextResponse.json({ error: `「${f.label}」格式不正确` }, { status: 400 });
    }
    const str = typeof v === "string" ? v : "";
    if (f.required && !str.trim()) {
      return NextResponse.json({ error: `请填写「${f.label}」` }, { status: 400 });
    }
    if (str.length > 20000) {
      return NextResponse.json(
        { error: `「${f.label}」内容过长（最多 2 万字）` },
        { status: 400 }
      );
    }
    cleanInputs[f.key] = str;
  }

  const moderationError = moderateInputs(cleanInputs);
  if (moderationError) {
    return NextResponse.json({ error: moderationError }, { status: 400 });
  }

  // 原子扣款：条件更新，余额不足时 count===0，杜绝并发把余额扣成负数
  const debit = await prisma.user.updateMany({
    where: { id: user.id, credits: { gte: skill.costCredits } },
    data: { credits: { decrement: skill.costCredits } },
  });
  if (debit.count === 0) {
    return NextResponse.json(
      { error: `积分不足：本技能需 ${skill.costCredits} 积分，当前余额 ${user.credits}` },
      { status: 402 }
    );
  }

  // 扣款成功后，任何后续失败都必须退款；先建运行记录
  const ip = clientIp(req);
  let run;
  try {
    run = await prisma.run.create({
      data: {
        userId: user.id,
        skillId: skill.id,
        inputs: JSON.stringify(cleanInputs),
        creditsSpent: skill.costCredits,
        ip,
      },
    });
  } catch (e) {
    await prisma.user
      .update({ where: { id: user.id }, data: { credits: { increment: skill.costCredits } } })
      .catch(() => {});
    console.error("[run] create failed:", e);
    return NextResponse.json(
      { error: USER_FACING_UPSTREAM_ERROR, refunded: true },
      { status: 500 }
    );
  }

  const refund = async () => {
    await prisma.user
      .update({ where: { id: user.id }, data: { credits: { increment: skill.costCredits } } })
      .catch(() => {});
    await prisma.run
      .update({ where: { id: run.id }, data: { status: "error", creditsSpent: 0 } })
      .catch(() => {});
  };

  const values: Record<string, string> = {};
  for (const f of fields) values[f.key] = cleanInputs[f.key].trim();
  const messages: ChatMessage[] = [
    { role: "system", content: skill.systemPrompt },
    { role: "user", content: renderTemplate(skill.promptTemplate, values) },
  ];

  const controller = new AbortController();
  // 客户端断开时取消上游连接，停止计费
  req.signal.addEventListener("abort", () => controller.abort());

  let upstream: AsyncGenerator<string>;
  try {
    upstream = chatStream(skill.model, messages, controller.signal);
    // 提前拉取第一段，确保上游连接成功后再向客户端返回 200
    const first = await upstream.next();
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(ctrl) {
        let output = "";
        let clientGone = false;
        let blocked = false;

        // 向客户端安全写入；一旦失败说明客户端已断开
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
            // 输出侧增量审核：命中即停（《暂行办法》"发现即停止生成/传输"）
            if (checkSensitive(output)) {
              blocked = true;
              controller.abort();
              break;
            }
            // 客户端已断开则主动停止上游，避免继续计费
            if (clientGone) {
              controller.abort();
              break;
            }
          }

          if (blocked) {
            // 违规内容：不落库明文，标记 blocked，退款（用户未获得有效结果）
            await prisma.run
              .update({ where: { id: run.id }, data: { status: "blocked", output: "", creditsSpent: 0 } })
              .catch(() => {});
            await prisma.user
              .update({ where: { id: user.id }, data: { credits: { increment: skill.costCredits } } })
              .catch(() => {});
            push({ error: "生成内容包含违规信息，已终止（积分已退回）", refunded: true });
            return;
          }

          // 正常完成（含客户端中途断开）：落库已生成内容并扣费成立，不退款
          await prisma.$transaction([
            prisma.run.update({
              where: { id: run.id },
              data: { output, status: "done" },
            }),
            prisma.skill.update({
              where: { id: skill.id },
              data: { runsCount: { increment: 1 } },
            }),
          ]);
          // 创作者分成（官方技能 creatorId 为空则跳过）
          await accrueCreatorEarning(skill.creatorId, skill.id, skill.costCredits);
          // 被邀请人首次成功生成：给双方发邀请奖励（幂等）
          const inviteReward = await maybeRewardInvite(user.id).catch(() => 0);
          const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
          push({
            done: true,
            credits: updatedUser.credits,
            runId: run.id,
            inviteReward: inviteReward || undefined,
          });
        } catch (e) {
          // 只有上游真正失败才退款；客户端断开不会走到这里（push 吞掉了 enqueue 错误）
          if (e instanceof UpstreamError || (e instanceof Error && e.name !== "AbortError")) {
            console.error("[run] upstream error:", e instanceof Error ? e.message : e);
            await refund();
            push({ error: USER_FACING_UPSTREAM_ERROR, refunded: true });
          }
        } finally {
          try {
            ctrl.close();
          } catch {
            // 已关闭
          }
        }
      },
      cancel() {
        // 客户端取消读取：停止上游
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
    // 首段就失败（连接不上/鉴权失败等）：退款并返回通用错误
    console.error("[run] init error:", e instanceof Error ? e.message : e);
    await refund();
    return NextResponse.json(
      { error: USER_FACING_UPSTREAM_ERROR, refunded: true },
      { status: 502 }
    );
  }
}
