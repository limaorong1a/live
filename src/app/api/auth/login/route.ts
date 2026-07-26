import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const raw = await req.json().catch(() => ({}));
  const email =
    typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
  const password = typeof raw.password === "string" ? raw.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "请输入邮箱和密码" }, { status: 400 });
  }

  // 按目标邮箱限流：不可伪造，直接保护被攻击的账号免遭暴力破解
  if (!rateLimit(`login:${email}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "该账号登录尝试过多，请 15 分钟后再试" },
      { status: 429 }
    );
  }

  const ip = clientIp(req);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    await prisma.auditLog
      .create({ data: { type: "login_fail", userId: user?.id ?? null, ip, detail: email } })
      .catch(() => {});
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  await createSession(user.id);
  await prisma.auditLog
    .create({ data: { type: "login", userId: user.id, ip } })
    .catch(() => {});
  return NextResponse.json({ ok: true });
}
