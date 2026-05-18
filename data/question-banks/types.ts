export type InterviewRound =
  | "综合"
  | "HR"
  | "业务"
  | "主管"
  | "终面"
  | "压力"
  | "英文";

export type InterviewQuestion = {
  id: string;
  question: string;
  expectedPoints: string[];
  scoringRubric: string;
  round: InterviewRound[];
};

export type InterviewBank = {
  id: string;
  title: string;
  description: string;
  questions: InterviewQuestion[];
};
