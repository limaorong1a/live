import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// 站点地图：首页 + 静态页 + 所有已上架技能页，利于搜索引擎收录长尾流量
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

  const skills = await prisma.skill
    .findMany({
      where: { published: true, reviewStatus: "approved" },
      select: { slug: true, createdAt: true },
    })
    .catch(() => []);

  const skillUrls: MetadataRoute.Sitemap = skills.map((s) => ({
    url: `${base}/skills/${s.slug}`,
    lastModified: s.createdAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/terms`, priority: 0.3 },
    { url: `${base}/privacy`, priority: 0.3 },
    ...skillUrls,
  ];
}
