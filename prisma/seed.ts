import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import { XHS_COMPLIANCE_KB } from "../src/lib/knowledge/xiaohongshu-compliance";

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
  {
    slug: "friend-circle",
    name: "朋友圈文案",
    description: "旅行、美食、加班、晒娃、emo……任何场景生成有格调的朋友圈配文。",
    category: "生活实用",
    emoji: "📸",
    costCredits: 1,
    inputs: [
      { key: "scene", label: "场景 / 想发什么", type: "text", placeholder: "例如：一个人看海 / 加班到深夜 / 娃第一天上学", required: true },
      { key: "mood", label: "想要的调性", type: "select", options: ["文艺高级", "幽默搞笑", "凡尔赛", "简短有力", "小清新"], required: true },
    ],
    systemPrompt:
      "你是朋友圈文案高手，写的配文有格调不土味、不油腻，符合当代年轻人审美，长短适中。",
    promptTemplate:
      "场景：{{scene}}\n调性：{{mood}}\n\n请给出6条朋友圈文案（长短搭配，可含少量恰当 emoji），并附1条适合的话题标签建议。",
  },
  {
    slug: "apology-letter",
    name: "万能道歉信",
    description: "跟对象、朋友、客户、领导闹别扭？帮你写出真诚又得体的道歉话术。",
    category: "生活实用",
    emoji: "🙏",
    costCredits: 1,
    inputs: [
      { key: "who", label: "跟谁道歉", type: "text", placeholder: "例如：女朋友 / 客户 / 室友", required: true },
      { key: "what", label: "发生了什么", type: "textarea", placeholder: "简单说明起因和你的错处", required: true },
      { key: "tone", label: "希望的语气", type: "select", options: ["诚恳走心", "轻松哄人", "正式书面"], required: true },
    ],
    systemPrompt:
      "你是高情商沟通专家，写的道歉既承认问题、表达诚意，又不卑不亢、给双方台阶，真正能修复关系。",
    promptTemplate:
      "对象：{{who}}\n事情经过：{{what}}\n语气：{{tone}}\n\n请写出：1) 一段完整的道歉话术；2) 一个更简短的口头/微信版本；3) 一句挽回关系的关键提醒。",
  },
  {
    slug: "leave-note",
    name: "请假条 / 借口生成",
    description: "请假、迟到、爽约需要一个合理说法？生成得体可信的说辞（请合理使用）。",
    category: "生活实用",
    emoji: "📝",
    costCredits: 1,
    inputs: [
      { key: "purpose", label: "需要什么说法", type: "text", placeholder: "例如：跟领导请一天假 / 迟到的说明", required: true },
      { key: "style", label: "正式程度", type: "select", options: ["正式书面请假条", "微信口语版"], required: true },
    ],
    systemPrompt:
      "你是职场沟通助手，帮用户组织得体、合理、有分寸的请假或说明措辞。提醒用户诚信为本，不编造严重虚假理由。",
    promptTemplate:
      "需求：{{purpose}}\n形式：{{style}}\n\n请给出一份得体的措辞，并附一句沟通小建议。",
  },
  {
    slug: "gift-idea",
    name: "送礼参谋",
    description: "不知道送什么？根据对象、预算、场合，给出贴心又不踩雷的送礼方案。",
    category: "生活实用",
    emoji: "🎁",
    costCredits: 1,
    inputs: [
      { key: "who", label: "送给谁", type: "text", placeholder: "例如：女朋友生日 / 领导 / 长辈", required: true },
      { key: "budget", label: "预算", type: "text", placeholder: "例如：300元以内", required: true },
      { key: "extra", label: "补充信息（选填）", type: "textarea", placeholder: "对方的喜好、你们的关系、场合等" },
    ],
    systemPrompt:
      "你是贴心的送礼顾问，懂人情世故和送礼禁忌，推荐既有心意又实用、不踩雷的礼物，兼顾预算。",
    promptTemplate:
      "对象：{{who}}\n预算：{{budget}}\n补充：{{extra}}\n\n请推荐6个送礼方案（含大致价位、推荐理由、加分小细节），并提示1个该场合的送礼禁忌。",
  },
  {
    slug: "travel-plan",
    name: "旅行行程规划",
    description: "输入目的地和天数，生成含景点、美食、交通的实用行程单。",
    category: "生活实用",
    emoji: "🧳",
    costCredits: 2,
    inputs: [
      { key: "dest", label: "目的地", type: "text", placeholder: "例如：成都 / 云南大理", required: true },
      { key: "days", label: "天数", type: "text", placeholder: "例如：3天2晚", required: true },
      { key: "pref", label: "偏好（选填）", type: "textarea", placeholder: "例如：带老人、爱美食、不想太赶、预算有限" },
    ],
    systemPrompt:
      "你是资深旅行规划师，行程务实不踩坑，兼顾节奏、交通和体力，会给出接地气的当地美食和避坑提示。",
    promptTemplate:
      "目的地：{{dest}}\n天数：{{days}}\n偏好：{{pref}}\n\n请输出：1) 逐日行程（上午/下午/晚上，含景点与交通衔接）；2) 必吃当地美食清单；3) 3条避坑与实用贴士。",
  },
  {
    slug: "festival-greeting",
    name: "节日祝福语",
    description: "春节、中秋、生日、婚礼……生成不俗套、有心意的祝福语。",
    category: "生活实用",
    emoji: "🎉",
    costCredits: 1,
    inputs: [
      { key: "occasion", label: "什么场合", type: "text", placeholder: "例如：春节给长辈 / 同事结婚 / 朋友生日", required: true },
      { key: "style", label: "风格", type: "select", options: ["真诚温暖", "幽默有梗", "文采飞扬", "简短祝福"], required: true },
    ],
    systemPrompt:
      "你是祝福语创作高手，写的祝福不落俗套、真诚有温度，能根据关系和场合调整分寸。",
    promptTemplate:
      "场合：{{occasion}}\n风格：{{style}}\n\n请给出6条祝福语（长短搭配），其中至少1条适合直接发微信、1条适合当面说或写贺卡。",
  },
  {
    slug: "essay-feedback",
    name: "作文批改老师",
    description: "中小学作文批改：点评优缺点、给出修改建议和范例段落。",
    category: "学习教育",
    emoji: "✏️",
    costCredits: 2,
    inputs: [
      { key: "grade", label: "年级", type: "text", placeholder: "例如：初二 / 小学五年级", required: true },
      { key: "essay", label: "作文内容", type: "textarea", placeholder: "粘贴孩子的作文原文", required: true },
    ],
    systemPrompt:
      "你是一位经验丰富、鼓励式教学的语文老师。批改要具体、能落地，先肯定优点再指出问题，给出可模仿的修改示范，语气温和不打击孩子。",
    promptTemplate:
      "年级：{{grade}}\n\n作文原文：\n{{essay}}\n\n请给出：1) 总体评分与一句话总评；2) 3个优点；3) 3个可改进处（含具体修改示范）；4) 一段升格后的示范段落。",
  },
  {
    slug: "math-solver",
    name: "数学解题助手",
    description: "拍不清题就打字问，给出分步骤讲解和思路，辅导作业不求人。",
    category: "学习教育",
    emoji: "🔢",
    costCredits: 2,
    inputs: [
      { key: "grade", label: "年级 / 难度", type: "text", placeholder: "例如：初一 / 高中函数", required: true },
      { key: "problem", label: "题目", type: "textarea", placeholder: "把题目文字输入进来", required: true },
    ],
    systemPrompt:
      "你是耐心的数学老师，解题分步骤、讲思路而不只给答案，帮助学生真正理解。会提醒易错点。",
    promptTemplate:
      "年级/难度：{{grade}}\n题目：\n{{problem}}\n\n请：1) 分析已知与所求；2) 分步骤详解（讲清每步为什么这么做）；3) 给出最终答案；4) 指出这类题的易错点或通用方法。",
  },
  {
    slug: "product-desc",
    name: "电商详情文案",
    description: "淘宝/拼多多/抖音小店商品的卖点提炼与详情页文案，一键出稿。",
    category: "新媒体运营",
    emoji: "🛒",
    costCredits: 2,
    inputs: [
      { key: "product", label: "商品是什么", type: "text", placeholder: "例如：加厚保暖袜 / 便携榨汁杯", required: true },
      { key: "selling", label: "卖点 / 特色", type: "textarea", placeholder: "材质、功能、价格优势、适用人群等", required: true },
      { key: "platform", label: "平台", type: "select", options: ["淘宝天猫", "拼多多", "抖音小店", "小红书店铺"], required: true },
    ],
    systemPrompt:
      "你是电商文案专家，懂各平台调性和转化心理，文案有卖点、有场景、有信任感，不夸大违规。",
    promptTemplate:
      "商品：{{product}}\n卖点：{{selling}}\n平台：{{platform}}\n\n请输出：1) 5个吸睛主标题；2) 详情页卖点文案（分点，含使用场景和人群）；3) 一段打消顾虑的信任话术。",
  },
  {
    slug: "live-script",
    name: "直播带货话术",
    description: "生成留人、逼单、讲卖点的直播话术，新手主播也能照着念。",
    category: "新媒体运营",
    emoji: "🎙️",
    costCredits: 2,
    inputs: [
      { key: "product", label: "带货商品", type: "text", placeholder: "例如：面膜 / 空气炸锅", required: true },
      { key: "price", label: "价格与优惠", type: "text", placeholder: "例如：原价199，直播价99，前100单送赠品", required: true },
    ],
    systemPrompt:
      "你是资深直播带货操盘手，话术有节奏（留人-讲品-逼单），口语化、有感染力，符合平台规范不虚假宣传。",
    promptTemplate:
      "商品：{{product}}\n价格优惠：{{price}}\n\n请输出一套直播话术：1) 留人开场（3句）；2) 卖点讲解（结合场景痛点）；3) 逼单话术（营造稀缺紧迫感）；4) 应对'太贵了'的话术。",
  },
  {
    slug: "diet-plan",
    name: "健身减脂食谱",
    description: "根据目标和忌口，生成一周三餐搭配和简单运动建议。仅供参考。",
    category: "生活实用",
    emoji: "🥗",
    costCredits: 2,
    inputs: [
      { key: "goal", label: "目标", type: "select", options: ["减脂", "增肌", "健康均衡", "控糖"], required: true },
      { key: "info", label: "个人情况（选填）", type: "textarea", placeholder: "身高体重、忌口、有无运动基础、预算等" },
    ],
    systemPrompt:
      "你是营养与健身教练，方案科学、接地气、易执行，兼顾中国人饮食习惯。必须声明：内容仅供参考，特殊疾病人群请遵医嘱。",
    promptTemplate:
      "目标：{{goal}}\n个人情况：{{info}}\n\n请给出：1) 一日三餐示范搭配（食材易买、做法简单）；2) 3条饮食原则；3) 适合的简单运动建议。结尾提醒仅供参考、特殊情况遵医嘱。",
  },

  // ========== 小红书运营工作台（垂直深耕）：起号→选题→生产→过审→复盘闭环 ==========
  {
    slug: "xhs-positioning",
    name: "起号定位诊断",
    description: "输入赛道，输出账号人设定位、选题矩阵和前10篇起号选题，新手起号不迷路。",
    category: "小红书运营",
    emoji: "🧭",
    costCredits: 3,
    inputs: [
      { key: "niche", label: "你想做的赛道 / 领域", type: "text", placeholder: "例如：平价穿搭 / 育儿好物 / 减脂餐", required: true },
      { key: "background", label: "你的优势或背景（选填）", type: "textarea", placeholder: "例如：宝妈、95后、从事美妆行业3年" },
    ],
    systemPrompt:
      "你是资深小红书起号操盘手，帮素人博主找准差异化定位。定位要具体、可执行、有记忆点，避开红海同质化。输出用 Markdown 分点。",
    promptTemplate:
      "赛道：{{niche}}\n我的背景：{{background}}\n\n请输出：1) 3个差异化人设定位方向（含一句话账号简介）；2) 选题矩阵（4-5个内容支柱，每个配示例选题）；3) 前10篇起号选题清单（含建议标题）；4) 起号阶段的3条避坑提醒。",
  },
  {
    slug: "xhs-competitor",
    name: "竞品爆款拆解",
    description: "粘贴对标博主的爆款笔记，拆解钩子、结构、爆点，反推可复制的选题公式。",
    category: "小红书运营",
    emoji: "🔍",
    costCredits: 3,
    inputs: [
      { key: "content", label: "对标爆款笔记（标题+正文）", type: "textarea", placeholder: "把对标博主的爆款笔记复制进来", required: true },
      { key: "myniche", label: "我的赛道（选填）", type: "text", placeholder: "用于反推适合我的选题" },
    ],
    systemPrompt:
      "你是小红书爆款拆解专家，擅长逆向分析爆文的底层逻辑。拆解要具体到可模仿的公式，而非泛泛而谈。",
    promptTemplate:
      "对标爆款：\n{{content}}\n\n我的赛道：{{myniche}}\n\n请拆解：1) 标题钩子公式（用了什么心理机制）；2) 正文结构骨架（逐段作用）；3) 引发互动/收藏的爆点设计；4) 提炼出的可复制选题公式；5) 给我的赛道套用该公式的3个选题。",
  },
  {
    slug: "xhs-comments",
    name: "评论区选题挖掘",
    description: "喂入爆款笔记的评论区，挖掘受众真实焦虑和需求，产出下一批高潜选题。",
    category: "小红书运营",
    emoji: "💬",
    costCredits: 2,
    inputs: [
      { key: "comments", label: "评论区内容", type: "textarea", placeholder: "复制一批评论粘贴进来（越多越准）", required: true },
    ],
    systemPrompt:
      "你是用户洞察专家，擅长从评论中提炼真实痛点和未被满足的需求，转化为高潜力选题。",
    promptTemplate:
      "评论区内容：\n{{comments}}\n\n请输出：1) 受众高频焦虑/痛点（按提及频次排序）；2) 未被满足的需求缺口；3) 基于这些洞察的8个高潜选题（含建议标题）。",
  },
  {
    slug: "xhs-content",
    name: "爆款标题+正文生成",
    description: "输入主题一键出爆款标题和正文，自带违禁词规避，风格贴合小红书网感。",
    category: "小红书运营",
    emoji: "🔥",
    costCredits: 2,
    inputs: [
      { key: "topic", label: "笔记主题", type: "text", placeholder: "例如：油皮夏天不脱妆的5个技巧", required: true },
      { key: "type", label: "笔记类型", type: "select", options: ["干货教程", "好物种草", "个人经历", "避雷测评", "情绪共鸣"], required: true },
      { key: "points", label: "想突出的内容点（选填）", type: "textarea", placeholder: "卖点、亲身体验、数据等" },
    ],
    systemPrompt:
      "你是百万粉小红书博主，文案有网感、口语化、多用 emoji、分段清晰、有钩子有互动引导。务必规避广告法绝对化用语和平台违禁词，不做站外导流。",
    promptTemplate:
      "主题：{{topic}}\n类型：{{type}}\n内容点：{{points}}\n\n请输出：1) 5个爆款标题（含emoji，20字内，带钩子）；2) 一篇完整正文（分段、有emoji、结尾引导点赞收藏关注）；3) 8-10个精准话题标签；4) 一句合规提示：如为AI辅助创作建议标注。",
  },
  {
    slug: "xhs-cover",
    name: "封面文案与配图脚本",
    description: "规划9图笔记：封面大字文案、每张配图内容脚本和统一视觉风格建议。",
    category: "小红书运营",
    emoji: "🖼️",
    costCredits: 2,
    inputs: [
      { key: "topic", label: "笔记主题", type: "text", placeholder: "例如：新手化妆步骤", required: true },
      { key: "style", label: "想要的视觉风格", type: "select", options: ["清新ins风", "高级莫兰迪", "元气少女", "简约高级黑白", "复古胶片"], required: true },
    ],
    systemPrompt:
      "你是小红书视觉策划，懂封面3秒抓眼球和图集叙事节奏。给出可直接照做的配图脚本和统一风格规范。",
    promptTemplate:
      "主题：{{topic}}\n风格：{{style}}\n\n请输出：1) 封面方案（大字标题文案+画面构图建议）；2) 内页9张配图脚本（每张的画面内容+文字）；3) 统一视觉规范（配色、字体、排版）让整套图风格一致。",
  },
  {
    slug: "xhs-compliance",
    name: "笔记合规体检",
    description: "发布前一键扫描违禁词和红线，标注限流封号风险并给出可过审替代写法。护城河技能。",
    category: "小红书运营",
    emoji: "🛡️",
    costCredits: 3,
    inputs: [
      { key: "title", label: "笔记标题", type: "text", placeholder: "把要发的标题粘进来", required: true },
      { key: "body", label: "笔记正文", type: "textarea", placeholder: "把正文粘进来", required: true },
      { key: "tags", label: "话题标签（选填）", type: "text", placeholder: "#话题1 #话题2" },
    ],
    systemPrompt:
      "你是小红书合规审核专家，依据下方知识库逐条扫描用户笔记的违规风险，帮助博主规避限流封号。判断要具体、指出原文片段、给出可过审替代。\n\n" +
      XHS_COMPLIANCE_KB,
    promptTemplate:
      "【待检测笔记】\n标题：{{title}}\n\n正文：\n{{body}}\n\n话题：{{tags}}\n\n请按知识库要求逐项体检并输出风险清单、替代写法、AI标注判定与总体结论。",
  },
  {
    slug: "xhs-ai-label",
    name: "AI标注合规助手",
    description: "判断你的内容是否需按新规标注“AI生成”，一键生成合规声明，规避未标注扣分。",
    category: "小红书运营",
    emoji: "🤖",
    costCredits: 1,
    inputs: [
      { key: "desc", label: "内容情况说明", type: "textarea", placeholder: "例如：封面图是AI生成的，正文是我自己写的；或：全部用AI辅助写的测评", required: true },
    ],
    systemPrompt:
      "你是熟悉2026年生成式AI内容标注新规的合规顾问。依据'使用AI生成的图文视频需显著标注'的规定，判断是否需标注并给出合规声明文案。",
    promptTemplate:
      "内容情况：{{desc}}\n\n请输出：1) 是否需要标注AI生成（明确结论+依据）；2) 若需要，给出2条可直接用的标注声明文案（一条简短版、一条正式版）；3) 标注位置建议；4) 不标注的潜在风险提醒。",
  },
  {
    slug: "xhs-analytics",
    name: "数据复盘与迭代",
    description: "粘贴笔记后台数据，诊断掉量断点，输出下一篇的具体优化动作清单。",
    category: "小红书运营",
    emoji: "📊",
    costCredits: 2,
    inputs: [
      { key: "data", label: "笔记数据", type: "textarea", placeholder: "例如：曝光1.2万、点击率6%、点赞30、收藏15、评论2、涨粉3", required: true },
      { key: "content", label: "笔记标题/主题（选填）", type: "text", placeholder: "用于结合内容分析" },
    ],
    systemPrompt:
      "你是小红书数据运营专家，能从曝光/点击率/互动数据定位问题环节（封面标题/内容/引导），给出可执行的优化动作，而非空泛建议。",
    promptTemplate:
      "笔记数据：{{data}}\n笔记主题：{{content}}\n\n请诊断：1) 数据反映的核心问题（定位到封面标题/内容质量/互动引导哪一环）；2) 逐项优化动作清单（下一篇具体怎么改）；3) 是否值得二次翻新重发的建议。",
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

  // ========== 一键工作流：多技能自动串联出成品 ==========
  const workflows = [
    {
      slug: "xhs-oneshot",
      name: "小红书爆款一条龙",
      description: "填一次主题，自动『生成爆款笔记 → 发布前合规体检』，直接出可发成品。",
      emoji: "🚀",
      category: "小红书运营",
      inputs: [
        { key: "topic", label: "笔记主题", type: "text", placeholder: "例如：油皮夏天不脱妆的5个技巧", required: true },
        { key: "type", label: "笔记类型", type: "select", options: ["干货教程", "好物种草", "个人经历", "避雷测评", "情绪共鸣"], required: true },
        { key: "points", label: "想突出的内容点（选填）", type: "textarea", placeholder: "卖点、亲身体验、数据等" },
      ],
      steps: [
        {
          skillSlug: "xhs-content",
          title: "第1步：生成爆款笔记",
          inputMap: { topic: "{{workflow.topic}}", type: "{{workflow.type}}", points: "{{workflow.points}}" },
        },
        {
          skillSlug: "xhs-compliance",
          title: "第2步：发布前合规体检",
          inputMap: { title: "见下方正文", body: "{{step1}}", tags: "" },
        },
      ],
    },
    {
      slug: "job-sprint",
      name: "求职冲刺大礼包",
      description: "填一次简历和岗位，自动『优化简历 → 生成面试押题』，投递面试一步到位。",
      emoji: "🎯",
      category: "求职就业",
      inputs: [
        { key: "resume", label: "你的简历内容", type: "textarea", placeholder: "把简历文字粘贴到这里", required: true },
        { key: "target", label: "目标岗位", type: "text", placeholder: "例如：新媒体运营 / Java后端", required: true },
      ],
      steps: [
        {
          skillSlug: "resume-polish",
          title: "第1步：优化简历",
          inputMap: { resume: "{{workflow.resume}}", target: "{{workflow.target}}" },
        },
        {
          skillSlug: "interview-prep",
          title: "第2步：面试押题",
          inputMap: { job: "{{workflow.target}}", company: "", experience: "{{workflow.resume}}" },
        },
      ],
    },
  ];

  for (const w of workflows) {
    const { inputs, steps, ...rest } = w;
    const data = { ...rest, inputs: JSON.stringify(inputs), steps: JSON.stringify(steps) };
    await prisma.workflow.upsert({
      where: { slug: w.slug },
      update: data,
      create: data,
    });
  }
  console.log(`✅ 已写入 ${workflows.length} 个一键工作流`);

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
