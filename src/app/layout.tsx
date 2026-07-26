import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "技能中转站 SkillRelay — AI 技能，一键即用",
  description:
    "不用懂提示词、不用 API Key，简历优化、爆款文案、合同速查等 AI 技能按次付费，一键即用。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Nav />
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
          技能中转站 SkillRelay · 内容由 AI 生成，仅供参考
        </footer>
      </body>
    </html>
  );
}
