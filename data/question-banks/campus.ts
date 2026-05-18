import type { InterviewBank } from "./types";

export const campusBank: InterviewBank = {
  id: "campus",
  title: "应届生 / 实习生面试",
  description: "聚焦潜力、学习速度与校园经历迁移",
  questions: [
    {
      id: "campus-1",
      question: "介绍一次你在校园项目中承担关键职责的经历。",
      expectedPoints: ["职责边界", "执行动作", "结果影响"],
      scoringRubric: "看重主动性和承担度。",
      round: ["综合", "业务"],
    },
    {
      id: "campus-2",
      question: "没有正式工作经验时，你如何证明自己能胜任？",
      expectedPoints: ["可迁移能力", "学习案例", "成果证据"],
      scoringRubric: "论证是否有说服力。",
      round: ["HR", "综合"],
    },
    {
      id: "campus-3",
      question: "实习期间你犯过什么错，后来如何改进？",
      expectedPoints: ["错误认知", "改进动作", "复用机制"],
      scoringRubric: "是否具备成长型思维。",
      round: ["HR", "主管"],
    },
    {
      id: "campus-4",
      question: "当任务和课程冲突时，你如何做时间管理？",
      expectedPoints: ["优先级判断", "计划工具", "结果质量"],
      scoringRubric: "关注自驱与稳定交付。",
      round: ["综合", "压力"],
    },
    {
      id: "campus-5",
      question: "你未来两年的职业目标是什么？",
      expectedPoints: ["目标清晰", "路径合理", "阶段计划"],
      scoringRubric: "目标是否务实可执行。",
      round: ["HR", "终面"],
    },
  ],
};
