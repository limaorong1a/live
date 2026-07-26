"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RedeemForm() {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "兑换失败");
      setMsg({ ok: true, text: `兑换成功！当前余额 ${data.credits} 积分` });
      setCode("");
      window.dispatchEvent(new Event("sr:credits-changed"));
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "兑换失败" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        className="input flex-1"
        placeholder="输入卡密，例如 SR-XXXXXXXX"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        required
      />
      <button className="btn-primary shrink-0" disabled={loading}>
        {loading ? "兑换中…" : "兑换"}
      </button>
      {msg && (
        <span
          className={`self-center text-sm ${msg.ok ? "text-green-600" : "text-red-600"}`}
        >
          {msg.text}
        </span>
      )}
    </form>
  );
}
