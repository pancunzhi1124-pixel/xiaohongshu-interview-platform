import type { InterviewBank } from "./types";

export const englishBank: InterviewBank = {
  id: "english",
  name: "英文面试",
  description: "用于英文自我表达、协作与问题解决评估",
  targetUsers: "外企、跨境业务、英文沟通场景求职者",
  category: "教育语言",
  icon: "🌍",
  badge: "英文专项",
  accentColor: "indigo",
  questions: [
    {
      id: "english-1",
      question: "Please introduce yourself and your strongest professional capability.",
      expectedPoints: ["clear structure", "role relevance", "evidence-based example"],
      scoringRubric: "Fluency, relevance, and confidence.",
      round: ["英文", "综合"],
    },
    {
      id: "english-2",
      question: "Describe a challenging project and how you handled it.",
      expectedPoints: ["context", "actions", "results"],
      scoringRubric: "Problem-solving logic and clarity.",
      round: ["英文", "业务"],
    },
    {
      id: "english-3",
      question: "How do you prioritize tasks under tight deadlines?",
      expectedPoints: ["prioritization method", "execution plan", "trade-off rationale"],
      scoringRubric: "Decision quality under pressure.",
      round: ["英文", "压力"],
    },
    {
      id: "english-4",
      question: "Tell me about a conflict with a teammate and the resolution.",
      expectedPoints: ["conflict framing", "communication", "final outcome"],
      scoringRubric: "Collaboration and maturity.",
      round: ["英文", "主管"],
    },
    {
      id: "english-5",
      question: "Why do you want to join this company at this stage?",
      expectedPoints: ["company understanding", "motivation", "long-term fit"],
      scoringRubric: "Motivation depth and strategic fit.",
      round: ["英文", "终面"],
    },
  ],
};
