"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// 统一的 AI 输出渲染组件：GFM 语法，不渲染原始 HTML（防 XSS），
// react-markdown 默认就不解析 HTML，标签会按纯文本展示。
export default function Markdown({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-table:text-xs">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
