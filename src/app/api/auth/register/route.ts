import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { resolveInviter } from "@/lib/invite";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = clientIp(req);
  // 注册限流按 IP（部署在可信代理后为真实 IP；否则退化为全局桶做兜底）
  if (!rateLimit(`register:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "注册太频繁，请稍后再试" }, { status: 429 });
  }

  const raw = await req.json().catch(() => ({}));
  const email =
    typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
  const password = typeof raw.password === "string" ? raw.password : "";
  const agreed = raw.agreed === true;
  const inviteCode = typeof raw.invite === "string" ? raw.invite : null;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
  }
  if (!agreed) {
    return NextResponse.json(
      { error: "请先阅读并同意《用户协议》和《隐私政策》" },
      { status: 400 }
    );
  }

  // 校验邀请码（无效则忽略，不阻断注册）
  const invitedById = await resolveInviter(inviteCode);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        agreedAt: new Date(),
        invitedById,
      },
    });
    await createSession(user.id);
    await prisma.auditLog
      .create({ data: { type: "register", userId: user.id, ip } })
      .catch(() => {});
    return NextResponse.json({ ok: true, credits: user.credits });
  } catch (e) {
    // 并发注册同一邮箱：唯一约束冲突返回 409 而非 500
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "该邮箱已注册，请直接登录" }, { status: 409 });
    }
    throw e;
  }
}
