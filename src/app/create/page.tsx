import CreateSkillClient from "./CreateSkillClient";

export default function CreatePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">创作技能</h1>
      <p className="mb-6 text-sm text-slate-500">
        把你的专业能力做成 AI 技能，审核通过后即可上架供所有用户使用。
        创作者分成结算功能即将上线，早期入驻的技能将获得首页推荐位。
      </p>
      <CreateSkillClient />
    </div>
  );
}
