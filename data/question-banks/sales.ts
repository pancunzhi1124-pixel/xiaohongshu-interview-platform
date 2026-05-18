import type { InterviewBank } from "./types";

export const salesBank: InterviewBank = {
  id: "sales",
  name: "销售 / 商务 BD 面试",
  description: "考察线索转化、谈判与客户经营能力",
  targetUsers: "销售顾问、商务BD、客户开发岗位求职者",
  category: "销售客服",
  icon: "🤝",
  badge: "高薪岗位",
  accentColor: "cyan",
  questions: [
    {
      id: "sales-1",
      question: "你如何开发并筛选高质量线索？",
      expectedPoints: ["客户画像", "线索来源", "优先级机制"],
      scoringRubric: "线索策略是否有效。",
      round: ["业务", "综合"],
    },
    {
      id: "sales-2",
      question: "谈一次你拿下关键客户的过程。",
      expectedPoints: ["需求挖掘", "方案匹配", "成交关键"],
      scoringRubric: "成交路径是否清晰。",
      round: ["业务", "终面"],
    },
    {
      id: "sales-3",
      question: "客户反复压价时你会如何谈判？",
      expectedPoints: ["价值阐述", "让步策略", "底线管理"],
      scoringRubric: "谈判能力与原则性。",
      round: ["压力", "主管"],
    },
    {
      id: "sales-4",
      question: "如何提升销售漏斗每一层的转化率？",
      expectedPoints: ["漏斗诊断", "行动方案", "数据复盘"],
      scoringRubric: "是否具备系统运营能力。",
      round: ["业务", "主管"],
    },
    {
      id: "sales-5",
      question: "你如何维护长期客户关系并促进续约？",
      expectedPoints: ["关系经营", "满意度管理", "增购机会"],
      scoringRubric: "客户经营意识。",
      round: ["综合", "HR"],
    },
  ],
};
