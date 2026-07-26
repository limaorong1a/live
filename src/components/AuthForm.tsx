"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "操作失败");
      window.dispatchEvent(new Event("sr:credits-changed"));
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm">
      <div className="card">
        <h1 className="mb-1 text-xl font-bold text-slate-900">
          {mode === "login" ? "登录" : "注册"}
        </h1>
        <p className="mb-5 text-sm text-slate-500">
          {mode === "login"
            ? "欢迎回来"
            : "注册即送 20 体验积分，先用起来"}
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
              required
            />
          </label>
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
              <Link href="/register" className="text-brand-600 underline">
                免费注册
              </Link>
            </>
          ) : (
            <>
              已有账号？{" "}
              <Link href="/login" className="text-brand-600 underline">
                去登录
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
