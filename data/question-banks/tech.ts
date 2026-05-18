import type { InterviewBank } from "./types";

export const techBank: InterviewBank = {
  id: "tech",
  name: "技术岗基础面试",
  description: "关注工程基础、问题排查与协作交付",
  targetUsers: "前后端开发、测试、算法、运维岗位求职者",
  category: "技术产品",
  icon: "💻",
  badge: "高薪岗位",
  accentColor: "cyan",
  questions: [
    {
      id: "tech-1",
      question: "介绍一个你最熟悉的技术项目架构。",
      expectedPoints: ["架构说明", "关键模块", "技术权衡"],
      scoringRubric: "技术表达清晰度。",
      round: ["综合", "业务"],
    },
    {
      id: "tech-2",
      question: "线上故障排查通常如何进行？",
      expectedPoints: ["定位流程", "监控日志", "止损复盘"],
      scoringRubric: "排障方法是否成熟。",
      round: ["压力", "主管"],
    },
    {
      id: "tech-3",
      question: "你如何保证代码质量？",
      expectedPoints: ["测试策略", "评审规范", "持续改进"],
      scoringRubric: "工程实践能力。",
      round: ["业务", "综合"],
    },
    {
      id: "tech-4",
      question: "当需求频繁变化时你如何应对？",
      expectedPoints: ["迭代策略", "沟通机制", "风险管理"],
      scoringRubric: "协作与交付能力。",
      round: ["综合", "主管"],
    },
    {
      id: "tech-5",
      question: "讲一次性能优化经历及结果。",
      expectedPoints: ["瓶颈分析", "优化方案", "量化收益"],
      scoringRubric: "技术深度与结果。",
      round: ["业务", "终面"],
    },
  ],
};
