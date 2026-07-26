// 工作流类型定义与输入渲染。

import { renderTemplate } from "./skills";

export type WorkflowStep = {
  skillSlug: string;
  title: string; // 该步在界面上显示的名称
  // 该步所引用技能的每个输入字段，如何从工作流输入 / 前序步骤输出填充。
  // 模板支持占位符：{{workflow.字段key}} 引用用户输入；{{stepN}} 引用第 N 步（1 起）的输出。
  inputMap: Record<string, string>;
};

/**
 * 渲染某一步的技能输入。
 * workflowInputs：用户填写的工作流输入；stepOutputs：已完成步骤的输出（0 基）。
 */
export function renderStepInputs(
  inputMap: Record<string, string>,
  workflowInputs: Record<string, string>,
  stepOutputs: string[]
): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(workflowInputs)) vars[`workflow.${k}`] = v;
  stepOutputs.forEach((out, i) => (vars[`step${i + 1}`] = out));

  const result: Record<string, string> = {};
  for (const [key, tpl] of Object.entries(inputMap)) {
    // 复用技能模板渲染，但占位符键含点号，这里自行替换
    result[key] = tpl.replace(/\{\{([\w.]+)\}\}/g, (_, name: string) => vars[name] ?? "");
  }
  return result;
}

// 让 renderTemplate 可被复用（保持与技能一致的普通 {{key}} 语义）
export { renderTemplate };
