"use client";

import { useCallback, useEffect, useState } from "react";

type AdminUser = {
  id: string;
  email: string;
  credits: number;
  isAdmin: boolean;
  createdAt: string;
  _count: { runs: number };
};

export default function UserManager() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (query: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setUsers(data.users);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    }
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  const adjust = async (userId: string, email: string) => {
    const input = prompt(`调整 ${email} 的积分（正数增加，负数扣减）：`, "100");
    if (input === null) return;
    const delta = parseInt(input, 10);
    if (!Number.isInteger(delta) || delta === 0) {
      alert("请输入非零整数");
      return;
    }
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, delta }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "调整失败");
      return;
    }
    load(q);
  };

  return (
    <div className="grid gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(q);
        }}
        className="flex gap-2"
      >
        <input
          className="input max-w-xs"
          placeholder="按邮箱搜索"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn-ghost">搜索</button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="py-2 pr-4">邮箱</th>
              <th className="py-2 pr-4">积分</th>
              <th className="py-2 pr-4">运行次数</th>
              <th className="py-2 pr-4">注册时间</th>
              <th className="py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100">
                <td className="py-2 pr-4">
                  {u.email}
                  {u.isAdmin && (
                    <span className="ml-1 rounded bg-brand-50 px-1 text-[10px] text-brand-600">
                      管理员
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4 font-medium text-amber-600">{u.credits}</td>
                <td className="py-2 pr-4">{u._count.runs}</td>
                <td className="py-2 pr-4 text-slate-400">
                  {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                </td>
                <td className="py-2">
                  <button
                    className="text-xs text-brand-600 hover:underline"
                    onClick={() => adjust(u.id, u.email)}
                  >
                    调整积分
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && !error && (
          <p className="py-4 text-sm text-slate-400">没有匹配的用户</p>
        )}
      </div>
    </div>
  );
}
