// 技能输入字段的类型定义，Skill.inputs 字段存储的是 InputField[] 的 JSON。

export type InputField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select";
  placeholder?: string;
  required?: boolean;
  options?: string[]; // type 为 select 时的候选项
};

export function renderTemplate(
  template: string,
  values: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? "");
}
