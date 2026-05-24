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
  category?: string;
  difficulty?: "easy" | "medium" | "hard";
  expectedPoints: string[];
  scoringRubric: string;
  round: InterviewRound[];
  imagePaths?: string[];
};

export type InterviewBank = {
  id: string;
  name: string;
  description: string;
  targetUsers: string;
  category: string;
  icon: string;
  badge?: string;
  accentColor?: string;
  questions: InterviewQuestion[];
};
