import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

const DEV_FALLBACK = "dev-secret-change-me";
const rawSecret = process.env.JWT_SECRET || DEV_FALLBACK;
// 生产环境绝不允许使用默认/占位密钥启动，否则任何人都能伪造管理员会话
if (
  process.env.NODE_ENV === "production" &&
  (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEV_FALLBACK)
) {
  throw new Error(
    "JWT_SECRET 未配置或仍为默认值，拒绝以不安全的密钥启动。请在 .env 中设置一个高强度随机字符串。"
  );
}
const secret = new TextEncoder().encode(rawSecret);
const COOKIE_NAME = "sr_token";

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export function clearSession() {
  cookies().delete(COOKIE_NAME);
}

export async function getUserId(): Promise<string | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}

export async function getUser() {
  const id = await getUserId();
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
}
