"use client";

import { useEffect, useState } from "react";

type InviteInfo = {
  code: string;
  invitedCount: number;
  inviterReward: number;
  inviteeReward: number;
};

export default function InviteCard() {
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/invite", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.code) {
          setInfo(d);
          setLink(`${window.location.origin}/register?invite=${d.code}`);
        }
      })
      .catch(() => {});
  }, []);

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const ta = document.createElement("textarea");
        ta.value = link;
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
      // ignore
    }
  };

  if (!info) return null;

  return (
    <div className="card">
      <h2 className="mb-1 font-semibold text-slate-900">邀请好友，双方得积分</h2>
      <p className="mb-3 text-sm text-slate-500">
        好友通过你的链接注册，并完成第一次生成后：你得
        <b className="text-amber-600"> {info.inviterReward} </b>
        积分，好友额外得
        <b className="text-amber-600"> {info.inviteeReward} </b>
        积分。已成功邀请{" "}
        <b className="text-slate-700">{info.invitedCount}</b> 人。
      </p>
      <div className="flex gap-2">
        <input className="input flex-1 text-xs" value={link} readOnly />
        <button className="btn-primary shrink-0" onClick={copy}>
          {copied ? "✅ 已复制" : "复制链接"}
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        邀请码：<span className="font-mono font-medium text-slate-600">{info.code}</span>
      </p>
    </div>
  );
}
