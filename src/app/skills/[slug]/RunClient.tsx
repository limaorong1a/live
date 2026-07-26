"use client";

import { useState } from "react";
import Link from "next/link";
import type { InputField } from "@/lib/skills";
import Markdown from "@/components/Markdown";

type Props = {
  slug: string;
  costCredits: number;
  fields: InputField[];
  initialValues?: Record<string, string>;
};

export default function RunClient({ slug, costCredits, fields, initialValues }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of fields) {
      init[f.key] =
        initialValues?.[f.key] ??
        (f.type === "select" && f.options?.length ? f.options[0] : "");
    }
    return init;
  });
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [needCredits, setNeedCredits] = useState(false);
  const [copied, setCopied] = useState(false);

  const set = (key: string, v: string) => setValues((s) => ({ ...s, [key]: v }));

  const run = async () => {
    setError(null);
    setNeedLogin(false);
    setNeedCredits(false);
    setOutput("");
    setCopied(false);
    setRunning(true);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, inputs: values }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) setNeedLogin(true);
        if (res.status === 402) setNeedCredits(true);
        throw new Error(data.error || `请求失败 (${res.status})`);
      }
      if (!res.body) throw new Error("当前浏览器不支持流式响应，请更换浏览器");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const evt of events) {
          const line = evt.trim();
          if (!line.startsWith("data:")) continue;
          try {
            const data = JSON.parse(line.slice(5).trim());
            if (data.delta) setOutput((o) => o + data.delta);
            if (data.error) {
              setError(
                data.refunded ? `${data.error}（积分已退回）` : data.error
              );
            }
            if (data.done) {
              window.dispatchEvent(new Event("sr:credits-changed"));
            }
          } catch {
            // 跳过无法解析的片段
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "运行失败，请重试");
    } finally {
      setRunning(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("复制失败，请手动选择文本复制");
    }
  };

  return (
    <div className="grid gap-6">
      <div className="card grid gap-4">
        {fields.map((f) => (
          <label key={f.key} className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">
              {f.label}
              {f.required && <span className="ml-0.5 text-red-500">*</span>}
            </span>
            {f.type === "textarea" ? (
              <textarea
                className="input min-h-32"
                placeholder={f.placeholder}
                value={values[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
              />
            ) : f.type === "select" ? (
              <select
                className="input"
                value={values[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
              >
                {f.options?.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="input"
                placeholder={f.placeholder}
                value={values[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
              />
            )}
          </label>
        ))}

        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">
            本次消耗 <b className="text-amber-600">{costCredits}</b> 积分
            （失败自动退回）
          </span>
          <button className="btn-primary" onClick={run} disabled={running}>
            {running ? "生成中…" : output ? "🔄 重新生成" : "▶ 开始生成"}
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
            {needLogin && (
              <>
                {" "}
                <Link href="/login" className="font-medium underline">
                  去登录
                </Link>
              </>
            )}
            {needCredits && (
              <>
                {" "}
                <Link href="/account" className="font-medium underline">
                  去充值
                </Link>
              </>
            )}
            {!needLogin && !needCredits && (
              <button onClick={run} className="ml-2 font-medium underline">
                重试
              </button>
            )}
          </div>
        )}
      </div>

      {(output || running) && (
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">生成结果</h2>
            {output && !running && (
              <button className="btn-ghost !py-1 text-xs" onClick={copy}>
                {copied ? "✅ 已复制" : "📋 复制全文"}
              </button>
            )}
          </div>
          {output ? (
            <Markdown content={output} />
          ) : (
            <p className="text-sm text-slate-400">正在连接模型…</p>
          )}
          {running && <span className="animate-pulse text-slate-400">▍</span>}
        </div>
      )}
    </div>
  );
}
