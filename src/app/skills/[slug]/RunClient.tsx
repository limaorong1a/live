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
  const [runId, setRunId] = useState<string | null>(null);
  const [refineInput, setRefineInput] = useState("");
  const [refining, setRefining] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const outputBoxRef = useRef<HTMLDivElement>(null);

  const QUICK_REFINES = ["更正式一些", "更简短一些", "更口语化", "换一个角度重写"];

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
    setRunId(null);
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
              if (data.runId) setRunId(data.runId);
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

  // 基于当前结果追问/改写，流式替换结果
  const refine = async (instruction: string) => {
    if (!runId || refining || running) return;
    const text = instruction.trim();
    if (!text) return;
    setError(null);
    setNeedCredits(false);
    setRefining(true);
    setOutput("");
    setCopied(false);
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId, instruction: text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 402) setNeedCredits(true);
        throw new Error(data.error || `请求失败 (${res.status})`);
      }
      if (!res.body) throw new Error("当前浏览器不支持流式响应");
      setRefineInput("");
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
            if (data.error) setError(data.error);
            if (data.done) window.dispatchEvent(new Event("sr:credits-changed"));
          } catch {
            // ignore
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "改写失败，请重试");
    } finally {
      setRefining(false);
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
        {(output || running || refining) && (
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">
                生成结果
                <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-normal text-slate-500">
                  🤖 AI 生成
                </span>
              </h2>
              {output && !running && !refining && (
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
              {(running || refining) && (
                <span className="animate-pulse text-slate-400">▍</span>
              )}
            </div>

            {/* 追问 / 二次编辑：结果不满意，直接让 AI 改到满意 */}
            {runId && output && !running && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="mb-2 text-sm font-medium text-slate-700">
                  不满意？直接让它改（前 {2} 次免费）
                </p>
                <div className="mb-2 flex flex-wrap gap-2">
                  {QUICK_REFINES.map((q) => (
                    <button
                      key={q}
                      onClick={() => refine(q)}
                      disabled={refining}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 transition hover:bg-brand-50 hover:text-brand-600 disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="或输入具体修改要求，例如：把第二段改得更打动人"
                    value={refineInput}
                    disabled={refining}
                    onChange={(e) => setRefineInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") refine(refineInput);
                    }}
                  />
                  <button
                    className="btn-primary shrink-0"
                    onClick={() => refine(refineInput)}
                    disabled={refining || !refineInput.trim()}
                  >
                    {refining ? "改写中…" : "让它改"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
