import type { InterviewBank } from "./types";

export const ecommerceBank: InterviewBank = {
  id: "ecommerce",
  title: "电商运营面试",
  description: "覆盖流量、转化、活动与复购运营",
  questions: [
    {
      id: "ecommerce-1",
      question: "你会如何提升一个店铺的转化率？",
      expectedPoints: ["漏斗分析", "商品优化", "页面策略"],
      scoringRubric: "方案是否可落地。",
      round: ["业务", "综合"],
    },
    {
      id: "ecommerce-2",
      question: "大促前你如何制定活动节奏？",
      expectedPoints: ["目标分解", "资源编排", "风险预案"],
      scoringRubric: "全局规划能力。",
      round: ["业务", "主管"],
    },
    {
      id: "ecommerce-3",
      question: "ROI 持续偏低时你会怎么处理？",
      expectedPoints: ["投放诊断", "预算调整", "复盘机制"],
      scoringRubric: "是否数据驱动。",
      round: ["压力", "业务"],
    },
    {
      id: "ecommerce-4",
      question: "你如何提升老客复购和客单价？",
      expectedPoints: ["会员策略", "分层运营", "组合销售"],
      scoringRubric: "增长思路完整度。",
      round: ["综合", "业务"],
    },
    {
      id: "ecommerce-5",
      question: "举例说明一次你做过的爆品打造。",
      expectedPoints: ["选品逻辑", "供应协同", "结果指标"],
      scoringRubric: "结果与过程是否清晰。",
      round: ["业务", "终面"],
    },
  ],
};
