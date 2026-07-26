"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type SkillCard = {
  slug: string;
  name: string;
  description: string;
  category: string;
  emoji: string;
  costCredits: number;
  runsCount: number;
  isCommunity: boolean;
};

export default function SkillExplorer({ skills }: { skills: SkillCard[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("全部");

  const categories = useMemo(
    () => ["全部", ...Array.from(new Set(skills.map((s) => s.category)))],
    [skills]
  );

  const hot = useMemo(
    () =>
      [...skills]
        .filter((s) => s.runsCount > 0)
        .sort((a, b) => b.runsCount - a.runsCount)
        .slice(0, 3),
    [skills]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return skills.filter(
      (s) =>
        (category === "全部" || s.category === category) &&
        (!q ||
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q))
    );
  }, [skills, query, category]);

  const grouped = useMemo(() => {
    const map = new Map<string, SkillCard[]>();
    for (const s of filtered) {
      const list = map.get(s.category) ?? [];
      list.push(s);
      map.set(s.category, list);
    }
    return map;
  }, [filtered]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          className="input sm:max-w-xs"
          placeholder="🔍 搜索技能，例如：简历、文案"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full px-3 py-1 text-sm transition ${
                category === c
                  ? "bg-brand-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {hot.length > 0 && category === "全部" && !query.trim() && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">🔥 热门技能</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {hot.map((s) => (
              <Card key={s.slug} skill={s} highlight />
            ))}
          </div>
        </section>
      )}

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-slate-400">
          没有找到匹配的技能，换个关键词试试
        </p>
      ) : (
        Array.from(grouped.entries()).map(([cat, list]) => (
          <section key={cat} className="mb-10">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">{cat}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((s) => (
                <Card key={s.slug} skill={s} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function Card({ skill: s, highlight }: { skill: SkillCard; highlight?: boolean }) {
  return (
    <Link
      href={`/skills/${s.slug}`}
      className={`card transition hover:-translate-y-0.5 hover:shadow-md ${
        highlight ? "ring-1 ring-amber-200" : ""
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-2xl">{s.emoji}</span>
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
          {s.costCredits} 积分/次
        </span>
      </div>
      <h3 className="font-semibold text-slate-900">
        {s.name}
        {s.isCommunity && (
          <span className="ml-1.5 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-normal text-brand-600">
            创作者
          </span>
        )}
      </h3>
      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{s.description}</p>
      {s.runsCount > 0 && (
        <p className="mt-2 text-xs text-slate-400">已使用 {s.runsCount} 次</p>
      )}
    </Link>
  );
}
