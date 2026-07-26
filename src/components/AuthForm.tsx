"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

// 仅允许站内相对路径回跳，防开放重定向
function safeNext(next: string | null): string {
  if (!next) return "/";
  if (next.startsWith("/") && !next.startsWith("//")) return next;
  return "/";
}

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "register" && !agreed) {
      setError("请先阅读并勾选同意《用户协议》和《隐私政策》");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, agreed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "操作失败");
      window.dispatchEvent(new Event("sr:credits-changed"));
      router.push(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setLoading(false);
    }
  };

  const withNext = (path: string) =>
    next !== "/" ? `${path}?next=${encodeURIComponent(next)}` : path;

  return (
    <div className="mx-auto max-w-sm">
      <div className="card">
        <h1 className="mb-1 text-xl font-bold text-slate-900">
          {mode === "login" ? "登录" : "注册"}
        </h1>
        <p className="mb-5 text-sm text-slate-500">
          {mode === "login" ? "欢迎回来" : "注册即送 20 体验积分，先用起来"}
        </p>
        <form onSubmit={submit} className="grid gap-4">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">邮箱</span>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">密码</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
          </label>

          {mode === "register" && (
            <label className="flex items-start gap-2 text-xs text-slate-500">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>
                我已阅读并同意
                <Link href="/terms" target="_blank" className="text-brand-600 underline">
                  《用户协议》
                </Link>
                和
                <Link href="/privacy" target="_blank" className="text-brand-600 underline">
                  《隐私政策》
                </Link>
                ，且已年满 18 周岁（未满 18 周岁须在监护人指导下使用）
              </span>
            </label>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
          <button className="btn-primary" disabled={loading}>
            {loading ? "提交中…" : mode === "login" ? "登录" : "注册"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          {mode === "login" ? (
            <>
              还没有账号？{" "}
              <Link href={withNext("/register")} className="text-brand-600 underline">
                免费注册
              </Link>
            </>
          ) : (
            <>
              已有账号？{" "}
              <Link href={withNext("/login")} className="text-brand-600 underline">
                去登录
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
