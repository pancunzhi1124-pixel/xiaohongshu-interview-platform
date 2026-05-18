import type { InterviewBank } from "./types";

export const operationsBank: InterviewBank = {
  id: "operations",
  name: "新媒体 / 内容运营面试",
  description: "关注内容策略、增长与复盘能力",
  targetUsers: "新媒体运营、内容运营、小红书运营求职者",
  category: "运营增长",
  icon: "📣",
  badge: "热门",
  accentColor: "purple",
  questions: [
    {
      id: "operations-1",
      question: "你如何从0到1策划一个内容栏目？",
      expectedPoints: ["用户洞察", "选题机制", "迭代节奏"],
      scoringRubric: "策略与执行是否闭环。",
      round: ["业务", "综合"],
    },
    {
      id: "operations-2",
      question: "一条爆款内容你会如何拆解复用？",
      expectedPoints: ["要素拆解", "复用策略", "风险控制"],
      scoringRubric: "是否具备方法论。",
      round: ["业务", "主管"],
    },
    {
      id: "operations-3",
      question: "如果内容数据连续下滑两周，你会怎么排查？",
      expectedPoints: ["指标诊断", "实验方案", "恢复计划"],
      scoringRubric: "问题定位是否有效。",
      round: ["压力", "业务"],
    },
    {
      id: "operations-4",
      question: "你如何与设计和视频团队高效协同？",
      expectedPoints: ["协作机制", "反馈效率", "交付标准"],
      scoringRubric: "跨团队推进能力。",
      round: ["综合", "主管"],
    },
    {
      id: "operations-5",
      question: "请分享一次你主导的增长案例。",
      expectedPoints: ["目标定义", "核心动作", "增长结果"],
      scoringRubric: "成果是否量化可信。",
      round: ["业务", "终面"],
    },
  ],
};
