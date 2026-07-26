"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { InputField } from "@/lib/skills";
import Markdown from "@/components/Markdown";

type Props = {
  slug: string;
  costCredits: number;
  fields: InputField[];
  initialValues?: Record<string, string>;
};

const AI_TAG = "（本内容由 AI 生成 — 技能中转站）";

export default function RunClient({ slug, costCredits, fields, initialValues }: Props) {
  const pathname = usePathname();
  const storageKey = `sr:draft:${slug}`;

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
  const resultRef = useRef<HTMLDivElement>(null);
  const outputBoxRef = useRef<HTMLDivElement>(null);

  // 恢复上次因跳登录而暂存的输入
  useEffect(() => {
    if (initialValues) return;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setValues((v) => ({ ...v, ...parsed }));
        sessionStorage.removeItem(storageKey);
      }
    } catch {
      // ignore
    }
  }, [storageKey, initialValues]);

  // 流式输出时自动跟随滚动到底部
  useEffect(() => {
    if (running && outputBoxRef.current) {
      outputBoxRef.current.scrollTop = outputBoxRef.current.scrollHeight;
    }
  }, [output, running]);

  const set = (key: string, v: string) => setValues((s) => ({ ...s, [key]: v }));

  const validate = (): string | null => {
    for (const f of fields) {
      if (f.required && !values[f.key]?.trim()) return `请填写「${f.label}」`;
    }
    return null;
  };

  const run = async () => {
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setNeedLogin(false);
    setNeedCredits(false);
    setOutput("");
    setCopied(false);
    setRunning(true);
    // 移动端：滚动到结果区并收起键盘
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (typeof document !== "undefined") {
      (document.activeElement as HTMLElement | null)?.blur?.();
    }

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, inputs: values }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setNeedLogin(true);
          // 暂存输入，登录回来自动恢复
          try {
            sessionStorage.setItem(storageKey, JSON.stringify(values));
          } catch {
            // ignore
          }
        }
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
                data.refunded ? `${data.error}` : data.error
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

  const copy = async (withMarkdown: boolean) => {
    // 优先取渲染后的纯文本；「复制 Markdown」则用原始文本
    const plain = outputBoxRef.current?.innerText ?? output;
    const text = (withMarkdown ? output : plain) + "\n\n" + AI_TAG;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // 微信/QQ 内置浏览器降级方案
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("复制失败，请手动长按选择文本复制");
    }
  };

  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

  return (
    <div className="grid gap-6">
      <div className="card grid gap-4">
        {fields.map((f) => (
          <label key={f.key} className="grid gap-1.5">
            <span className="flex items-center justify-between text-sm font-medium text-slate-700">
              <span>
                {f.label}
                {f.required && <span className="ml-0.5 text-red-500">*</span>}
              </span>
              {f.type === "textarea" && (
                <span className="text-xs font-normal text-slate-400">
                  {values[f.key]?.length ?? 0} / 20000
                </span>
              )}
            </span>
            {f.type === "textarea" ? (
              <textarea
                className="input min-h-32"
                placeholder={f.placeholder}
                value={values[f.key]}
                maxLength={20000}
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
                maxLength={2000}
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
                <Link href={loginHref} className="font-medium underline">
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

      <div ref={resultRef}>
        {(output || running) && (
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">
                生成结果
                <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-normal text-slate-500">
                  🤖 AI 生成
                </span>
              </h2>
              {output && !running && (
                <div className="flex gap-2">
                  <button className="btn-ghost !py-1 text-xs" onClick={() => copy(false)}>
                    {copied ? "✅ 已复制" : "📋 复制文本"}
                  </button>
                  <button className="btn-ghost !py-1 text-xs" onClick={() => copy(true)}>
                    复制 Markdown
                  </button>
                </div>
              )}
            </div>
            <div ref={outputBoxRef} className="max-h-[70vh] overflow-y-auto">
              {output ? (
                <Markdown content={output} />
              ) : (
                <p className="text-sm text-slate-400">正在连接模型…</p>
              )}
              {running && <span className="animate-pulse text-slate-400">▍</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
