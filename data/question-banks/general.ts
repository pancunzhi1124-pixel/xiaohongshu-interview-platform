import type { InterviewBank } from "./types";

export const generalBank: InterviewBank = {
  id: "general",
  name: "通用求职面试",
  description: "适用于大多数岗位的结构化行为与动机问题",
  targetUsers: "通用求职人群，社招与转岗候选人",
  category: "通用求职",
  icon: "💼",
  badge: "推荐",
  accentColor: "blue",
  questions: [
    {
      id: "general-1",
      question: "自我介绍并说明你最匹配该岗位的三点优势。",
      expectedPoints: ["结构清晰", "岗位匹配", "有量化成果"],
      scoringRubric: "结构完整、和岗位相关、举例可信。",
      round: ["综合", "HR"],
    },
    {
      id: "general-2",
      question: "讲一个你主导解决复杂问题的案例。",
      expectedPoints: ["问题定义", "行动路径", "结果复盘"],
      scoringRubric: "能体现独立思考与闭环。",
      round: ["综合", "业务"],
    },
    {
      id: "general-3",
      question: "你为什么想加入我们而不是同行公司？",
      expectedPoints: ["行业理解", "公司认知", "个人动机"],
      scoringRubric: "动机真实且有研究深度。",
      round: ["HR", "终面"],
    },
    {
      id: "general-4",
      question: "描述一次跨团队协作冲突，你如何处理？",
      expectedPoints: ["冲突识别", "沟通策略", "协同结果"],
      scoringRubric: "体现合作、共识与推进能力。",
      round: ["综合", "主管"],
    },
    {
      id: "general-5",
      question: "如果前三个月目标未达标，你会怎么调整？",
      expectedPoints: ["诊断思路", "优先级", "执行计划"],
      scoringRubric: "体现复盘与纠偏能力。",
      round: ["压力", "主管"],
    },
  ],
};
