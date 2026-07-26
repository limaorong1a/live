"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, type InputField } from "@/lib/skills";

type EditableField = InputField & { optionsText?: string };

const EMOJIS = ["✨", "🧠", "📄", "🎯", "💼", "🎨", "📊", "🛠️", "💡", "🔥"];

export default function CreateSkillClient() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [emoji, setEmoji] = useState("✨");
  const [costCredits, setCostCredits] = useState(1);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [promptTemplate, setPromptTemplate] = useState("");
  const [fields, setFields] = useState<EditableField[]>([
    { key: "content", label: "输入内容", type: "textarea", required: true },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const setField = (i: number, patch: Partial<EditableField>) =>
    setFields((fs) => fs.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  const addField = () =>
    setFields((fs) =>
      fs.length >= 6
        ? fs
        : [...fs, { key: `field${fs.length + 1}`, label: "", type: "text", required: false }]
    );

  const removeField = (i: number) =>
    setFields((fs) => (fs.length <= 1 ? fs : fs.filter((_, idx) => idx !== i)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = {
        name,
        description,
        category,
        emoji,
        costCredits,
        systemPrompt,
        promptTemplate,
        fields: fields.map((f) => ({
          key: f.key,
          label: f.label,
          type: f.type,
          placeholder: f.placeholder,
          required: f.required,
          options:
            f.type === "select"
              ? (f.optionsText ?? "").split(/[,，]/).map((s) => s.trim()).filter(Boolean)
              : undefined,
        })),
      };
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "提交失败");
      setOk(true);
      setTimeout(() => router.push("/account"), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "提交失败");
    } finally {
      setLoading(false);
    }
  };

  if (ok) {
    return (
      <div className="card text-center">
        <p className="text-2xl">🎉</p>
        <p className="mt-2 font-medium text-slate-900">提交成功，等待审核</p>
        <p className="mt-1 text-sm text-slate-500">审核结果可在「我的账户」中查看</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-6">
      <div className="card grid gap-4">
        <h2 className="font-semibold text-slate-900">基本信息</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">技能名称 *</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：朋友圈文案高手" maxLength={20} required />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">分类 *</span>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-700">一句话简介 *</span>
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="这个技能帮用户解决什么问题？" maxLength={100} required />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">图标</span>
            <div className="flex flex-wrap gap-1">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`rounded-lg px-2 py-1 text-xl ${emoji === e ? "bg-brand-100 ring-2 ring-brand-500" : "hover:bg-slate-100"}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">单次定价（1-10 积分）*</span>
            <input className="input" type="number" min={1} max={10} value={costCredits} onChange={(e) => setCostCredits(parseInt(e.target.value || "1", 10))} required />
          </label>
        </div>
      </div>

      <div className="card grid gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">用户输入字段（1-6 个）</h2>
          <button type="button" className="btn-ghost !py-1 text-xs" onClick={addField} disabled={fields.length >= 6}>
            + 添加字段
          </button>
        </div>
        {fields.map((f, i) => (
          <div key={i} className="grid gap-3 rounded-lg border border-slate-200 p-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1">
                <span className="text-xs text-slate-500">字段标识（英文）</span>
                <input className="input" value={f.key} onChange={(e) => setField(i, { key: e.target.value })} placeholder="topic" required />
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-slate-500">显示名称</span>
                <input className="input" value={f.label} onChange={(e) => setField(i, { label: e.target.value })} placeholder="主题" required />
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-slate-500">类型</span>
                <select className="input" value={f.type} onChange={(e) => setField(i, { type: e.target.value as InputField["type"] })}>
                  <option value="text">单行文本</option>
                  <option value="textarea">多行文本</option>
                  <option value="select">下拉选择</option>
                </select>
              </label>
            </div>
            {f.type === "select" && (
              <label className="grid gap-1">
                <span className="text-xs text-slate-500">候选项（用逗号分隔）</span>
                <input className="input" value={f.optionsText ?? ""} onChange={(e) => setField(i, { optionsText: e.target.value })} placeholder="正式,委婉,幽默" />
              </label>
            )}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={f.required ?? false} onChange={(e) => setField(i, { required: e.target.checked })} />
                必填
              </label>
              {fields.length > 1 && (
                <button type="button" className="text-xs text-red-500 hover:underline" onClick={() => removeField(i)}>
                  删除此字段
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="card grid gap-4">
        <h2 className="font-semibold text-slate-900">提示词配置</h2>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-700">角色设定（System Prompt）*</span>
          <textarea className="input min-h-24" value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} placeholder="你是一位……擅长……输出风格……" required />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-700">
            提示词模板 *（用 {"{{字段标识}}"} 引用用户输入）
          </span>
          <textarea className="input min-h-32" value={promptTemplate} onChange={(e) => setPromptTemplate(e.target.value)} placeholder={"主题：{{topic}}\n\n请帮我……"} required />
        </label>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}
      <button className="btn-primary justify-self-start" disabled={loading}>
        {loading ? "提交中…" : "提交审核"}
      </button>
    </form>
  );
}
