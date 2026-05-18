import type { InterviewBank } from "./types";

export const educationBank: InterviewBank = {
  id: "education",
  title: "教师 / 教培面试",
  description: "关注教学设计、课堂管理与学习效果",
  questions: [
    {
      id: "education-1",
      question: "你如何设计一节高参与度课程？",
      expectedPoints: ["教学目标", "互动设计", "评估方式"],
      scoringRubric: "教学设计能力。",
      round: ["业务", "综合"],
    },
    {
      id: "education-2",
      question: "学生学习效果不佳时你如何调整？",
      expectedPoints: ["问题诊断", "分层辅导", "跟踪反馈"],
      scoringRubric: "教学迭代能力。",
      round: ["压力", "主管"],
    },
    {
      id: "education-3",
      question: "如何处理课堂纪律问题？",
      expectedPoints: ["规则建立", "沟通方式", "秩序恢复"],
      scoringRubric: "课堂管理能力。",
      round: ["综合", "HR"],
    },
    {
      id: "education-4",
      question: "请分享一次家校沟通的挑战案例。",
      expectedPoints: ["需求理解", "沟通策略", "结果改进"],
      scoringRubric: "沟通与同理心。",
      round: ["HR", "终面"],
    },
    {
      id: "education-5",
      question: "你如何用数据评估教学质量？",
      expectedPoints: ["指标选取", "数据采集", "改进闭环"],
      scoringRubric: "数据化教学意识。",
      round: ["业务", "主管"],
    },
  ],
};
