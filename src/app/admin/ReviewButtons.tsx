"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviewButtons({ skillId }: { skillId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const review = async (action: "approve" | "reject") => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/review", {
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
    <span className="flex shrink-0 gap-2">
      <button
        className="rounded-lg bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
        onClick={() => review("approve")}
        disabled={loading}
      >
        通过
      </button>
      <button
        className="rounded-lg bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
        onClick={() => review("reject")}
        disabled={loading}
      >
        拒绝
      </button>
    </span>
  );
}
