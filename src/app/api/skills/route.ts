import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { CATEGORIES, type InputField } from "@/lib/skills";

export const runtime = "nodejs";

function bad(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

// 创作者提交技能（进入待审核状态）
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (!rateLimit(`skill-create:${user.id}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "提交太频繁，每小时最多提交 5 个技能" },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { name, description, category, emoji, costCredits, systemPrompt, promptTemplate } =
    body;
  const fields: unknown = body.fields;

  if (typeof name !== "string" || !name.trim() || name.length > 20)
    return bad("技能名称必填，最多 20 字");
  if (typeof description !== "string" || !description.trim() || description.length > 100)
    return bad("技能简介必填，最多 100 字");
  if (!CATEGORIES.includes(category)) return bad("分类不正确");
  if (typeof emoji !== "string" || !emoji.trim() || emoji.length > 8)
    return bad("请选择一个 emoji 图标");
  const cost = Number(costCredits);
  if (!Number.isInteger(cost) || cost < 1 || cost > 10)
    return bad("单次积分定价必须是 1-10 的整数");
  if (typeof systemPrompt !== "string" || !systemPrompt.trim() || systemPrompt.length > 4000)
    return bad("角色设定必填，最多 4000 字");
  if (
    typeof promptTemplate !== "string" ||
    !promptTemplate.trim() ||
    promptTemplate.length > 8000
  )
    return bad("提示词模板必填，最多 8000 字");

  if (!Array.isArray(fields) || fields.length < 1 || fields.length > 6)
    return bad("请配置 1-6 个输入字段");
  const cleanFields: InputField[] = [];
  const seenKeys = new Set<string>();
  for (const f of fields) {
    if (typeof f !== "object" || f === null) return bad("输入字段格式错误");
    const { key, label, type, placeholder, required, options } = f as Record<string, unknown>;
    if (typeof key !== "string" || !/^[a-z][a-z0-9_]{0,19}$/.test(key))
      return bad("字段标识必须是小写字母开头的英文（如 topic、my_text）");
    if (seenKeys.has(key)) return bad(`字段标识重复：${key}`);
    seenKeys.add(key);
    if (typeof label !== "string" || !label.trim() || label.length > 30)
      return bad("字段名称必填，最多 30 字");
    if (type !== "text" && type !== "textarea" && type !== "select")
      return bad("字段类型不正确");
    const clean: InputField = {
      key,
      label: label.trim(),
      type,
      required: Boolean(required),
    };
    if (typeof placeholder === "string" && placeholder.trim())
      clean.placeholder = placeholder.trim().slice(0, 100);
    if (type === "select") {
      if (
        !Array.isArray(options) ||
        options.length < 2 ||
        options.length > 10 ||
        !options.every((o) => typeof o === "string" && o.trim())
      )
        return bad("下拉字段需要 2-10 个候选项");
      clean.options = options.map((o) => (o as string).trim().slice(0, 30));
    }
    cleanFields.push(clean);
  }

  // 模板中引用的占位符必须都是已定义的字段
  const usedKeys = Array.from(promptTemplate.matchAll(/\{\{(\w+)\}\}/g)).map((m) => m[1]);
  for (const k of usedKeys) {
    if (!seenKeys.has(k)) return bad(`模板中的占位符 {{${k}}} 没有对应的输入字段`);
  }
  if (usedKeys.length === 0)
    return bad("提示词模板中至少要使用一个 {{字段标识}} 占位符");

  const slug = `u-${user.id.slice(-6)}-${Date.now().toString(36)}`;
  const skill = await prisma.skill.create({
    data: {
      slug,
      name: name.trim(),
      description: description.trim(),
      category,
      emoji: emoji.trim(),
      inputs: JSON.stringify(cleanFields),
      systemPrompt: systemPrompt.trim(),
      promptTemplate: promptTemplate.trim(),
      costCredits: cost,
      reviewStatus: "pending",
      published: true,
      creatorId: user.id,
    },
  });

  return NextResponse.json({ ok: true, slug: skill.slug });
}
