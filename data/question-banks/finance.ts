import type { InterviewBank } from "./types";

export const financeBank: InterviewBank = {
  id: "finance",
  title: "财务 / 会计面试",
  description: "涵盖核算、预算、内控与财务分析",
  questions: [
    {
      id: "finance-1",
      question: "你如何保证月结工作的准确与时效？",
      expectedPoints: ["流程安排", "对账机制", "风险控制"],
      scoringRubric: "专业度与执行力。",
      round: ["业务", "综合"],
    },
    {
      id: "finance-2",
      question: "预算偏差较大时你会如何分析？",
      expectedPoints: ["差异拆解", "原因归类", "改进建议"],
      scoringRubric: "分析能力与业务理解。",
      round: ["业务", "主管"],
    },
    {
      id: "finance-3",
      question: "面对跨部门报销争议你如何处理？",
      expectedPoints: ["制度依据", "沟通协商", "结果闭环"],
      scoringRubric: "原则性与沟通力。",
      round: ["HR", "综合"],
    },
    {
      id: "finance-4",
      question: "请讲一次你优化财务流程的案例。",
      expectedPoints: ["问题识别", "优化动作", "效率收益"],
      scoringRubric: "流程优化能力。",
      round: ["业务", "终面"],
    },
    {
      id: "finance-5",
      question: "如何识别并防范财务风险？",
      expectedPoints: ["风险清单", "预警机制", "内控执行"],
      scoringRubric: "风险意识与方法。",
      round: ["压力", "主管"],
    },
  ],
};
