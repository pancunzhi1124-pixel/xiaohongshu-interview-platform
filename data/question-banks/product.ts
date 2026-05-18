import type { InterviewBank } from "./types";

export const productBank: InterviewBank = {
  id: "product",
  name: "产品经理面试",
  description: "覆盖需求洞察、方案设计与推进能力",
  targetUsers: "产品经理、产品运营、策略产品求职者",
  category: "技术产品",
  icon: "🧩",
  badge: "热门",
  accentColor: "indigo",
  questions: [
    {
      id: "product-1",
      question: "你如何判断一个需求该不该做？",
      expectedPoints: ["目标对齐", "价值评估", "成本判断"],
      scoringRubric: "决策框架是否完整。",
      round: ["业务", "综合"],
    },
    {
      id: "product-2",
      question: "请讲一次你推动跨部门上线功能的经历。",
      expectedPoints: ["推进策略", "协同机制", "上线结果"],
      scoringRubric: "推动力与协调力。",
      round: ["综合", "主管"],
    },
    {
      id: "product-3",
      question: "核心指标下滑时你会如何定位原因？",
      expectedPoints: ["指标拆解", "假设验证", "行动优先级"],
      scoringRubric: "问题分析深度。",
      round: ["压力", "业务"],
    },
    {
      id: "product-4",
      question: "你如何写一份高质量 PRD？",
      expectedPoints: ["场景定义", "规则细节", "验收标准"],
      scoringRubric: "文档完整与可执行性。",
      round: ["业务", "主管"],
    },
    {
      id: "product-5",
      question: "如何平衡用户体验与商业化目标？",
      expectedPoints: ["冲突识别", "权衡方案", "结果评估"],
      scoringRubric: "产品取舍能力。",
      round: ["终面", "业务"],
    },
  ],
};
