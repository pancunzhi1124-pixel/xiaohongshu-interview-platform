import type { InterviewBank } from "./types";

export const dataAnalysisBank: InterviewBank = {
  id: "data-analysis",
  name: "数据分析面试",
  description: "聚焦指标体系、分析方法与业务洞察",
  targetUsers: "数据分析、商业分析、增长分析岗位求职者",
  category: "财务数据",
  icon: "📊",
  badge: "高频面试",
  accentColor: "blue",
  questions: [
    {
      id: "data-analysis-1",
      question: "你如何从业务目标设计指标体系？",
      expectedPoints: ["目标拆解", "指标分层", "口径统一"],
      scoringRubric: "体系化思维。",
      round: ["业务", "综合"],
    },
    {
      id: "data-analysis-2",
      question: "请分享一个你驱动决策的分析案例。",
      expectedPoints: ["问题定义", "分析方法", "业务影响"],
      scoringRubric: "洞察与落地能力。",
      round: ["业务", "终面"],
    },
    {
      id: "data-analysis-3",
      question: "数据异常时你会如何排查？",
      expectedPoints: ["数据链路", "口径校验", "修复措施"],
      scoringRubric: "严谨性与效率。",
      round: ["压力", "业务"],
    },
    {
      id: "data-analysis-4",
      question: "你如何向非数据同学讲清复杂结论？",
      expectedPoints: ["结构表达", "可视化", "行动建议"],
      scoringRubric: "沟通转化能力。",
      round: ["综合", "主管"],
    },
    {
      id: "data-analysis-5",
      question: "A/B 实验结果不显著时你会怎么做？",
      expectedPoints: ["样本评估", "假设调整", "后续方案"],
      scoringRubric: "实验思维是否完整。",
      round: ["业务", "压力"],
    },
  ],
};
