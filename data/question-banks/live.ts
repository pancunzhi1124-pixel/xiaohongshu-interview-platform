import type { InterviewBank } from "./types";

export const liveBank: InterviewBank = {
  id: "live",
  name: "直播运营面试",
  description: "关注直播间增长、留存与转化能力",
  targetUsers: "直播运营、直播中控、直播策划求职者",
  category: "运营增长",
  icon: "🎥",
  badge: "热门",
  accentColor: "pink",
  questions: [
    {
      id: "live-1",
      question: "你会如何设计一场直播的脚本节奏？",
      expectedPoints: ["开场策略", "互动节奏", "转化节点"],
      scoringRubric: "节奏设计是否合理。",
      round: ["业务", "综合"],
    },
    {
      id: "live-2",
      question: "直播在线人数下降时你会怎么救场？",
      expectedPoints: ["快速诊断", "互动策略", "资源调用"],
      scoringRubric: "临场应变能力。",
      round: ["压力", "业务"],
    },
    {
      id: "live-3",
      question: "你如何提升直播间停留时长？",
      expectedPoints: ["内容结构", "互动机制", "福利设计"],
      scoringRubric: "是否理解用户行为。",
      round: ["综合", "业务"],
    },
    {
      id: "live-4",
      question: "如何与主播配合达成成交目标？",
      expectedPoints: ["目标对齐", "分工机制", "复盘闭环"],
      scoringRubric: "协作与执行力。",
      round: ["主管", "业务"],
    },
    {
      id: "live-5",
      question: "分享一次你优化直播转化链路的案例。",
      expectedPoints: ["问题识别", "优化动作", "效果验证"],
      scoringRubric: "方法与结果可信度。",
      round: ["业务", "终面"],
    },
  ],
};
