"use client";

import { useState } from "react";

export default function CodeGenerator() {
  const [count, setCount] = useState(5);
  const [credits, setCredits] = useState(100);
  const [codes, setCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, credits }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "生成失败");
      setCodes(data.codes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1">
          <span className="text-xs text-slate-500">数量</span>
          <input className="input w-24" type="number" min={1} max={100} value={count} onChange={(e) => setCount(parseInt(e.target.value || "1", 10))} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-slate-500">面值（积分）</span>
          <input className="input w-32" type="number" min={1} value={credits} onChange={(e) => setCredits(parseInt(e.target.value || "1", 10))} />
        </label>
        <button className="btn-primary" onClick={generate} disabled={loading}>
          {loading ? "生成中…" : "生成"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {codes.length > 0 && (
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="mb-2 text-xs text-slate-500">
            已生成 {codes.length} 张卡密（请立即复制保存）：
          </p>
          <pre className="select-all text-sm text-slate-700">{codes.join("\n")}</pre>
        </div>
      )}
    </div>
  );
}
