import CreateSkillClient from "./CreateSkillClient";

export default function CreatePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">创作技能</h1>
      <p className="mb-6 text-sm text-slate-500">
        把你的专业能力做成 AI 技能，审核通过后即可上架供所有用户使用。
        <b className="text-green-600">用户每次使用你的技能，你都能赚取分成收益</b>，
        满额可提现，收益明细在「我的账户」查看。
      </p>
      <CreateSkillClient />
    </div>
  );
}
