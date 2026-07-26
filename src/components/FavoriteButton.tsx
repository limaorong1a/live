"use client";

import { useState } from "react";

export default function FavoriteButton({
  skillId,
  initial,
}: {
  skillId: string;
  initial: boolean;
}) {
  const [fav, setFav] = useState(initial);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      if (res.ok) setFav(data.favorited);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="btn-ghost !py-1.5 text-sm"
      title={fav ? "取消收藏" : "收藏"}
    >
      {fav ? "★ 已收藏" : "☆ 收藏"}
    </button>
  );
}
