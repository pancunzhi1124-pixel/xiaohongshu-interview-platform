import type { InterviewBank } from "./types";

export const serviceBank: InterviewBank = {
  id: "service",
  title: "客服 / 用户服务面试",
  description: "聚焦问题处理、情绪安抚与服务质量",
  questions: [
    {
      id: "service-1",
      question: "遇到情绪激动的用户你如何安抚？",
      expectedPoints: ["情绪识别", "沟通话术", "问题闭环"],
      scoringRubric: "服务态度与技巧。",
      round: ["综合", "压力"],
    },
    {
      id: "service-2",
      question: "你如何处理超出权限的客户诉求？",
      expectedPoints: ["边界说明", "升级机制", "跟进反馈"],
      scoringRubric: "规则与体验平衡。",
      round: ["业务", "HR"],
    },
    {
      id: "service-3",
      question: "如何定义并提升客服满意度？",
      expectedPoints: ["指标体系", "改进动作", "质量追踪"],
      scoringRubric: "数据化服务意识。",
      round: ["业务", "主管"],
    },
    {
      id: "service-4",
      question: "分享一次你把投诉转化为好评的案例。",
      expectedPoints: ["问题定位", "补救措施", "关系修复"],
      scoringRubric: "逆转能力与同理心。",
      round: ["综合", "终面"],
    },
    {
      id: "service-5",
      question: "高峰期工单积压时你怎么安排优先级？",
      expectedPoints: ["分级规则", "协同机制", "响应效率"],
      scoringRubric: "抗压与组织能力。",
      round: ["压力", "主管"],
    },
  ],
};
