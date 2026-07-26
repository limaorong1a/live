import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

type SeedSkill = {
  slug: string;
  name: string;
  description: string;
  category: string;
  emoji: string;
  costCredits: number;
  model?: string;
  inputs: object[];
  systemPrompt: string;
  promptTemplate: string;
};

const skills: SeedSkill[] = [
  {
    slug: "resume-polish",
    name: "简历优化师",
    description: "针对目标岗位重写你的简历，突出匹配点，量化成果，通过率翻倍。",
    category: "求职就业",
    emoji: "📄",
    costCredits: 2,
    inputs: [
      { key: "resume", label: "你的简历内容", type: "textarea", placeholder: "把简历文字粘贴到这里", required: true },
      { key: "target", label: "目标岗位", type: "text", placeholder: "例如：新媒体运营 / Java 后端工程师", required: true },
    ],
    systemPrompt:
      "你是一位有10年经验的资深HR和简历教练，深谙国内招聘市场和ATS筛选规则。你擅长把平淡的经历改写成有量化成果、与岗位强相关的表达。输出使用简洁的 Markdown。",
    promptTemplate:
      "目标岗位：{{target}}\n\n我的简历：\n{{resume}}\n\n请完成：1) 指出现有简历的3-5个关键问题；2) 逐段给出优化后的简历内容（保持真实，不编造经历，用 STAR 法则和量化表达）；3) 给出1条针对该岗位的求职建议。",
  },
  {
    slug: "interview-prep",
    name: "面试押题官",
    description: "根据岗位和你的背景，生成最可能被问到的问题和高分回答思路。",
    category: "求职就业",
    emoji: "🎤",
    costCredits: 2,
    inputs: [
      { key: "job", label: "目标岗位", type: "text", placeholder: "例如：产品经理", required: true },
      { key: "company", label: "公司或行业（选填）", type: "text", placeholder: "例如：字节跳动 / 跨境电商" },
      { key: "experience", label: "你的背景简介（选填）", type: "textarea", placeholder: "工作年限、项目经历等，越具体押题越准" },
    ],
    systemPrompt:
      "你是一位大厂面试官和求职辅导专家，熟悉各类岗位的面试套路。回答务实、接地气，不讲空话。输出使用 Markdown。",
    promptTemplate:
      "岗位：{{job}}\n公司/行业：{{company}}\n我的背景：{{experience}}\n\n请给出：1) 8个最可能被问到的面试问题（按出现概率排序，含1-2个刁钻问题）；2) 每个问题的高分回答思路和要点；3) 我应该反问面试官的2个问题。",
  },
  {
    slug: "xiaohongshu-copy",
    name: "小红书爆款文案",
    description: "一键生成带标题、正文、标签的小红书笔记，自带网感和 emoji。",
    category: "新媒体运营",
    emoji: "🍑",
    costCredits: 1,
    inputs: [
      { key: "topic", label: "主题 / 产品", type: "text", placeholder: "例如：平价防晒霜测评", required: true },
      { key: "style", label: "笔记风格", type: "select", options: ["种草安利", "干货教程", "情感共鸣", "避雷吐槽"], required: true },
      { key: "points", label: "卖点或要点（选填）", type: "textarea", placeholder: "想突出的卖点、个人体验等" },
    ],
    systemPrompt:
      "你是一位百万粉丝的小红书爆款操盘手，精通平台算法和用户心理。文案要有网感、口语化、多用 emoji，标题要有钩子。",
    promptTemplate:
      "主题：{{topic}}\n风格：{{style}}\n要点：{{points}}\n\n请输出：1) 5个爆款标题（含 emoji，20字内）；2) 1篇完整笔记正文（300-500字，分段清晰，有个人体验感）；3) 8-10个精准话题标签。",
  },
  {
    slug: "wechat-titles",
    name: "公众号标题大师",
    description: "根据文章内容生成10个高打开率标题，涵盖悬念、数字、共鸣等套路。",
    category: "新媒体运营",
    emoji: "📰",
    costCredits: 1,
    inputs: [
      { key: "content", label: "文章内容或摘要", type: "textarea", placeholder: "粘贴全文或核心内容摘要", required: true },
    ],
    systemPrompt:
      "你是一位10万+公众号主编，深谙微信生态的标题心理学：悬念、冲突、数字、身份共鸣、利益点前置。标题不做标题党，不违反平台规范。",
    promptTemplate:
      "文章内容：\n{{content}}\n\n请生成10个高打开率标题，按推荐度排序，每个标题后面用一句话说明它用了什么套路、适合什么发布场景。",
  },
  {
    slug: "short-video-script",
    name: "短视频脚本工坊",
    description: "生成含黄金3秒开头、分镜、口播文案的完整短视频脚本。",
    category: "新媒体运营",
    emoji: "🎬",
    costCredits: 2,
    inputs: [
      { key: "topic", label: "视频主题", type: "text", placeholder: "例如：3个让厨房小白翻身的技巧", required: true },
      { key: "duration", label: "时长", type: "select", options: ["30秒", "1分钟", "3分钟"], required: true },
      { key: "platform", label: "平台", type: "select", options: ["抖音", "快手", "视频号", "B站"], required: true },
    ],
    systemPrompt:
      "你是一位专业短视频编导，作品多次上热门。你懂完播率的关键是黄金3秒和信息密度。输出脚本使用表格分镜格式。",
    promptTemplate:
      "主题：{{topic}}\n时长：{{duration}}\n平台：{{platform}}\n\n请输出：1) 3个开头钩子方案（黄金3秒）；2) 完整分镜脚本表（镜头、画面、口播文案、时长）；3) 发布文案和话题标签建议。",
  },
  {
    slug: "contract-risk",
    name: "合同风险速查",
    description: "逐条排查合同中的风险条款和坑点，给出修改建议。仅供参考，不构成法律意见。",
    category: "商务办公",
    emoji: "⚖️",
    costCredits: 5,
    inputs: [
      { key: "contract", label: "合同文本", type: "textarea", placeholder: "粘贴合同全文或关键条款", required: true },
      { key: "role", label: "你的身份", type: "select", options: ["甲方", "乙方"], required: true },
    ],
    systemPrompt:
      "你是一位资深合同法律师，擅长从委托人立场排查合同风险。分析要具体到条款，指出风险等级（高/中/低）。必须在结尾声明：本分析仅供参考，不构成法律意见，重大合同请咨询执业律师。",
    promptTemplate:
      "我的身份：{{role}}\n\n合同文本：\n{{contract}}\n\n请从我方立场：1) 列出风险条款清单（条款位置、风险描述、风险等级）；2) 每条给出具体的修改建议文本；3) 指出合同缺失的重要保护性条款。",
  },
  {
    slug: "weekly-report",
    name: "周报生成器",
    description: "把零散的工作要点变成条理清晰、有亮点的周报，老板看了都说好。",
    category: "商务办公",
    emoji: "📅",
    costCredits: 1,
    inputs: [
      { key: "work", label: "本周做了什么", type: "textarea", placeholder: "随便罗列即可，例如：改了3个bug、开了2次会、上线了活动页", required: true },
      { key: "next", label: "下周计划（选填）", type: "textarea", placeholder: "下周打算做什么" },
    ],
    systemPrompt:
      "你是一位职场写作高手，擅长把琐碎工作提炼成有成果导向、有数据、有思考的周报。语言干练，不堆砌套话。",
    promptTemplate:
      "本周工作：\n{{work}}\n\n下周计划：\n{{next}}\n\n请生成一份结构化周报：1) 本周核心成果（提炼亮点，尽量量化）；2) 进行中事项与风险；3) 下周计划；4) 需要的支持（如有）。",
  },
  {
    slug: "email-writer",
    name: "高情商邮件助手",
    description: "催款、拒绝、道歉、请假……难开口的话，帮你写得体面又有效。",
    category: "商务办公",
    emoji: "✉️",
    costCredits: 1,
    inputs: [
      { key: "purpose", label: "你想表达什么", type: "text", placeholder: "例如：催客户付款 / 拒绝加班安排 / 向领导请假一周", required: true },
      { key: "tone", label: "语气", type: "select", options: ["正式", "委婉", "强硬但礼貌"], required: true },
      { key: "context", label: "背景补充（选填）", type: "textarea", placeholder: "对方是谁、之前的沟通情况等" },
    ],
    systemPrompt:
      "你是一位商务沟通专家，写的邮件/消息既维护关系又达成目的。中文语境，懂国内职场的分寸感。",
    promptTemplate:
      "目的：{{purpose}}\n语气：{{tone}}\n背景：{{context}}\n\n请写出：1) 一封完整的邮件（含主题行）；2) 一个适合微信发送的简短版本；3) 一句话提示：这类沟通的关键注意点。",
  },
  {
    slug: "translate-polish",
    name: "中英互译润色",
    description: "不是机翻，是地道的翻译+润色，学术、商务、日常风格任选。",
    category: "学习教育",
    emoji: "🌏",
    costCredits: 1,
    inputs: [
      { key: "text", label: "原文", type: "textarea", placeholder: "粘贴需要翻译或润色的文字", required: true },
      { key: "direction", label: "方向", type: "select", options: ["中译英", "英译中", "自动判断"], required: true },
      { key: "style", label: "风格", type: "select", options: ["学术", "商务", "日常"], required: true },
    ],
    systemPrompt:
      "你是一位专业译者和双语编辑，译文追求信达雅，避免翻译腔。会对原文中的表达问题一并润色。",
    promptTemplate:
      "翻译方向：{{direction}}\n风格：{{style}}\n\n原文：\n{{text}}\n\n请输出：1) 译文；2) 2-3处关键翻译选择的简要说明（为什么这样译）。",
  },
  {
    slug: "personal-statement",
    name: "留学文书打磨",
    description: "把你的经历素材打磨成有故事线、有个人特色的申请文书。",
    category: "学习教育",
    emoji: "🎓",
    costCredits: 5,
    inputs: [
      { key: "draft", label: "文书草稿或经历素材", type: "textarea", placeholder: "粘贴现有草稿，或罗列你的经历、成绩、动机", required: true },
      { key: "program", label: "申请项目 / 专业", type: "text", placeholder: "例如：美国CS硕士 / 英国传媒硕士", required: true },
    ],
    systemPrompt:
      "你是一位资深留学文书顾问，辅导过数百名学生拿到名校offer。你擅长挖掘个人故事线，避免模板化表达，符合海外招生官的阅读偏好。保持素材真实，不编造经历。",
    promptTemplate:
      "申请项目：{{program}}\n\n我的素材/草稿：\n{{draft}}\n\n请：1) 分析现有素材的亮点和薄弱点；2) 给出推荐的文书故事线结构；3) 产出一版完整的英文文书草稿（600-800词）；4) 指出还需要补充什么素材。",
  },
  {
    slug: "doc-summary",
    name: "长文速读摘要",
    description: "报告、论文、公告太长不想看？30秒拿到核心要点和结论。",
    category: "学习教育",
    emoji: "📖",
    costCredits: 2,
    inputs: [
      { key: "text", label: "长文内容", type: "textarea", placeholder: "粘贴文章、报告或文档内容", required: true },
      { key: "focus", label: "你最关心什么（选填）", type: "text", placeholder: "例如：对我个人有什么影响 / 数据结论" },
    ],
    systemPrompt:
      "你是一位专业分析师，擅长快速提炼长文档的核心信息，区分事实与观点，不遗漏关键数字和结论。",
    promptTemplate:
      "关注点：{{focus}}\n\n文档内容：\n{{text}}\n\n请输出：1) 一句话总结；2) 核心要点（5-8条，保留关键数据）；3) 值得注意的风险或争议点；4) 如果我只记住三件事，应该是哪三件。",
  },
  {
    slug: "naming-master",
    name: "起名大师",
    description: "店铺、产品、公司、网名——给出有寓意、好记、可注册的名字方案。",
    category: "生活实用",
    emoji: "🏷️",
    costCredits: 1,
    inputs: [
      { key: "type", label: "起名类型", type: "select", options: ["店铺", "产品", "公司", "个人网名", "宝宝小名"], required: true },
      { key: "desc", label: "描述与期望", type: "textarea", placeholder: "行业/定位/喜欢的风格/忌讳等，越详细越好", required: true },
    ],
    systemPrompt:
      "你是一位品牌命名专家，兼懂中文语感、文化寓意和商业传播。名字要好记、好读、有寓意、不撞名。",
    promptTemplate:
      "类型：{{type}}\n描述：{{desc}}\n\n请给出10个名字方案，每个附：寓意解释、适用场景、潜在风险（谐音/撞名等）。最后推荐你心中的前3名并说明理由。",
  },
];

function genCode() {
  return "SR-" + randomBytes(4).toString("hex").toUpperCase();
}

async function main() {
  for (const s of skills) {
    const { inputs, model, ...rest } = s;
    const data = {
      ...rest,
      model: model ?? "deepseek-chat",
      inputs: JSON.stringify(inputs),
    };
    await prisma.skill.upsert({
      where: { slug: s.slug },
      update: data,
      create: data,
    });
  }
  console.log(`✅ 已写入 ${skills.length} 个内置技能`);

  const existing = await prisma.redeemCode.count({ where: { usedById: null } });
  if (existing === 0) {
    const codes: string[] = [];
    for (let i = 0; i < 5; i++) {
      const code = genCode();
      await prisma.redeemCode.create({ data: { code, credits: 100 } });
      codes.push(code);
    }
    console.log("🎫 已生成 5 张 100 积分卡密（请妥善保存）：");
    codes.forEach((c) => console.log("   " + c));
  } else {
    console.log(`🎫 已存在 ${existing} 张未使用卡密，跳过生成`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
