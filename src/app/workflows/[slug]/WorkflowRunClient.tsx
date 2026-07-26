"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { InputField } from "@/lib/skills";
import Markdown from "@/components/Markdown";

type Props = {
  slug: string;
  totalCost: number;
  fields: InputField[];
  stepCount: number;
};

type StepState = { title: string; output: string; done: boolean };

export default function WorkflowRunClient({ slug, totalCost, fields, stepCount }: Props) {
  const pathname = usePathname();
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of fields) {
      init[f.key] = f.type === "select" && f.options?.length ? f.options[0] : "";
    }
    return init;
  });
  const [steps, setSteps] = useState<StepState[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [needCredits, setNeedCredits] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const set = (key: string, v: string) => setValues((s) => ({ ...s, [key]: v }));

  const run = async () => {
    for (const f of fields) {
      if (f.required && !values[f.key]?.trim()) {
        setError(`请填写「${f.label}」`);
        return;
      }
    }
    setError(null);
    setNeedLogin(false);
    setNeedCredits(false);
    setSteps([]);
    setRunning(true);
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (typeof document !== "undefined") {
      (document.activeElement as HTMLElement | null)?.blur?.();
    }

    try {
      const res = await fetch("/api/workflow/run", {
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
      if (!res.body) throw new Error("当前浏览器不支持流式响应");

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
            if (data.stepStart !== undefined) {
              setSteps((prev) => {
                const next = [...prev];
                next[data.stepStart] = { title: data.title, output: "", done: false };
                return next;
              });
            }
            if (data.step !== undefined && data.delta) {
              setSteps((prev) => {
                const next = [...prev];
                if (next[data.step]) {
                  next[data.step] = {
                    ...next[data.step],
                    output: next[data.step].output + data.delta,
                  };
                }
                return next;
              });
            }
            if (data.stepDone !== undefined) {
              setSteps((prev) => {
                const next = [...prev];
                if (next[data.stepDone]) next[data.stepDone] = { ...next[data.stepDone], done: true };
                return next;
              });
            }
            if (data.error) setError(data.error);
            if (data.done) window.dispatchEvent(new Event("sr:credits-changed"));
          } catch {
            // ignore
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "运行失败，请重试");
    } finally {
      setRunning(false);
    }
  };

  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

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
                className="input min-h-28"
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
                onChange={(e) => set(f.key, e.target.value)}
              />
            )}
          </label>
        ))}

        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">
            {stepCount} 步 · 共消耗 <b className="text-amber-600">{totalCost}</b> 积分
            （失败自动退回）
          </span>
          <button className="btn-primary" onClick={run} disabled={running}>
            {running ? "运行中…" : "🚀 一键运行"}
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
          </div>
        )}
      </div>

      <div ref={resultRef} className="grid gap-4">
        {steps.map((s, i) => (
          <div key={i} className="card">
            <h2 className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
              <span>{s.title}</span>
              {s.done ? (
                <span className="text-xs text-green-600">✓ 完成</span>
              ) : (
                <span className="text-xs text-slate-400">生成中…</span>
              )}
            </h2>
            {s.output ? (
              <Markdown content={s.output} />
            ) : (
              <p className="text-sm text-slate-400">正在生成…</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
