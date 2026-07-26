"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Me = { email: string; credits: number } | null;

export default function Nav() {
  const [me, setMe] = useState<Me>(null);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      const data = await res.json();
      setMe(data.user);
    } catch {
      setMe(null);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    // 技能运行结束后由运行页广播积分变化
    const onCredits = () => refresh();
    window.addEventListener("sr:credits-changed", onCredits);
    return () => window.removeEventListener("sr:credits-changed", onCredits);
  }, [refresh]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe(null);
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
          <span className="text-xl">🚉</span>
          <span>技能中转站</span>
          <span className="hidden text-xs font-normal text-slate-400 sm:inline">
            SkillRelay · AI 技能，一键即用
          </span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {!loaded ? null : me ? (
            <>
              <Link
                href="/account"
                className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700 hover:bg-amber-100"
              >
                ⚡ {me.credits} 积分
              </Link>
              <span className="hidden text-slate-500 sm:inline">{me.email}</span>
              <button onClick={logout} className="text-slate-500 hover:text-slate-800">
                退出
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-slate-600 hover:text-slate-900">
                登录
              </Link>
              <Link href="/register" className="btn-primary !py-1.5">
                免费注册领 20 积分
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
