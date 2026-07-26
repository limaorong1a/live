"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  skillId: string;
  published: boolean;
  reviewStatus: string;
};

export default function SkillManageButtons({ skillId, published, reviewStatus }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const act = async (action: "publish" | "unpublish" | "delete") => {
    if (action === "delete" && !confirm("确定删除该技能？此操作不可恢复。")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/skills/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId, action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "操作失败");
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <span className="flex gap-2 text-xs">
      {reviewStatus === "approved" &&
        (published ? (
          <button
            className="text-slate-500 hover:underline"
            onClick={() => act("unpublish")}
            disabled={loading}
          >
            下架
          </button>
        ) : (
          <button
            className="text-brand-600 hover:underline"
            onClick={() => act("publish")}
            disabled={loading}
          >
            重新上架
          </button>
        ))}
      <button
        className="text-red-500 hover:underline"
        onClick={() => act("delete")}
        disabled={loading}
      >
        删除
      </button>
    </span>
  );
}
