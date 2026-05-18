import type { InterviewBank } from "./types";

export const hrAdminBank: InterviewBank = {
  id: "hr-admin",
  name: "行政 / 人事面试",
  description: "关注组织支持、流程管理与沟通协调",
  targetUsers: "行政、人事、招聘、综合支持岗位求职者",
  category: "职能岗位",
  icon: "🏢",
  badge: "新手友好",
  accentColor: "green",
  questions: [
    {
      id: "hr-admin-1",
      question: "你如何提升招聘流程效率？",
      expectedPoints: ["流程诊断", "工具应用", "效率结果"],
      scoringRubric: "流程优化能力。",
      round: ["业务", "综合"],
    },
    {
      id: "hr-admin-2",
      question: "组织突发活动时你如何快速落地？",
      expectedPoints: ["资源协调", "时间规划", "风险控制"],
      scoringRubric: "执行与统筹能力。",
      round: ["压力", "主管"],
    },
    {
      id: "hr-admin-3",
      question: "如何处理员工与制度之间的冲突？",
      expectedPoints: ["制度理解", "沟通技巧", "平衡方案"],
      scoringRubric: "原则与柔性兼顾。",
      round: ["HR", "综合"],
    },
    {
      id: "hr-admin-4",
      question: "你做过哪些成本优化或采购管理？",
      expectedPoints: ["成本意识", "谈判执行", "效果量化"],
      scoringRubric: "精细化管理能力。",
      round: ["业务", "终面"],
    },
    {
      id: "hr-admin-5",
      question: "如何提升新员工入职体验？",
      expectedPoints: ["流程设计", "沟通触点", "反馈机制"],
      scoringRubric: "员工体验视角。",
      round: ["HR", "业务"],
    },
  ],
};
