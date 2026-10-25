export type SourceType = "psychology-book" | "teacher-course" | "other";

export type DistilledIdea = {
  name: string;
  explanation: string;
  classroomApplication: string;
};

export type DistilledMethod = {
  name: string;
  steps: string[];
  bestFor: string;
  cautions: string[];
};

export type ClassroomTranslation = {
  studentNeed: string;
  principle: string;
  activity: string;
};

export type EvidenceNote = {
  claim: string;
  sourceLocation: string;
  confidence: "high" | "medium" | "low";
};

export type KnowledgeDistillation = {
  summary: string;
  keyIdeas: DistilledIdea[];
  methods: DistilledMethod[];
  classroomTranslations: ClassroomTranslation[];
  evidenceNotes: EvidenceNote[];
  limitations: string[];
};

export type KnowledgeSource = {
  id: string;
  title: string;
  author: string;
  sourceType: SourceType;
  createdAt: string;
  distillation: KnowledgeDistillation;
};

export type LessonPlanStep = {
  minutes: number;
  stage: string;
  teacherActions: string;
  studentActions: string;
  purpose: string;
};

export type LessonPlan = {
  title: string;
  coreMessage: string;
  targetGroup: string;
  durationMinutes: number;
  objectives: string[];
  materials: string[];
  agenda: LessonPlanStep[];
  teacherScript: string[];
  discussionQuestions: string[];
  assessment: string[];
  followUp: string[];
  sourceAlignment: string[];
  safeguardingNotes: string[];
};

export const sourceTypeLabels: Record<SourceType, string> = {
  "psychology-book": "心理学书籍",
  "teacher-course": "教师课程",
  other: "其他资料",
};

export function distillationToMarkdown(item: KnowledgeDistillation): string {
  const lines: string[] = ["## 内容摘要", item.summary, "", "## 核心概念"];
  item.keyIdeas.forEach((idea, index) => {
    lines.push("", (index + 1) + ". **" + idea.name + "**", idea.explanation, "课堂转化：" + idea.classroomApplication);
  });
  lines.push("", "## 可操作的方法");
  item.methods.forEach((method, index) => {
    lines.push("", (index + 1) + ". **" + method.name + "**", "适用情境：" + method.bestFor);
    method.steps.forEach((step, stepIndex) => lines.push("   " + (stepIndex + 1) + ". " + step));
    if (method.cautions.length) lines.push("注意边界：" + method.cautions.join("；"));
  });
  lines.push("", "## 班会活动转化");
  item.classroomTranslations.forEach((entry, index) => {
    lines.push("", (index + 1) + ". 学生需要：" + entry.studentNeed, "理论原则：" + entry.principle, "活动设计：" + entry.activity);
  });
  lines.push("", "## 来源依据与待核实项");
  item.evidenceNotes.forEach((entry) => lines.push("- " + entry.claim + "（定位：" + entry.sourceLocation + "；可信度：" + entry.confidence + "）"));
  lines.push("", "## 适用边界");
  item.limitations.forEach((entry) => lines.push("- " + entry));
  return lines.join("\n");
}

export function lessonPlanToMarkdown(plan: LessonPlan): string {
  const lines: string[] = [
    "# " + plan.title,
    "",
    "> 核心主旨：" + plan.coreMessage,
    "",
    "- 适用对象：" + plan.targetGroup,
    "- 总时长：" + plan.durationMinutes + " 分钟",
    "",
    "## 一、教学目标",
  ];
  plan.objectives.forEach((item) => lines.push("- " + item));
  lines.push("", "## 二、课前准备");
  plan.materials.forEach((item) => lines.push("- " + item));
  lines.push("", "## 三、班会流程");
  plan.agenda.forEach((step, index) => {
    lines.push("", "### " + (index + 1) + ". " + step.stage + "（" + step.minutes + " 分钟）", "- 教师活动：" + step.teacherActions, "- 学生活动：" + step.studentActions, "- 设计意图：" + step.purpose);
  });
  lines.push("", "## 四、教师关键话术");
  plan.teacherScript.forEach((item) => lines.push("- " + item));
  lines.push("", "## 五、讨论与追问");
  plan.discussionQuestions.forEach((item) => lines.push("- " + item));
  lines.push("", "## 六、效果评价");
  plan.assessment.forEach((item) => lines.push("- " + item));
  lines.push("", "## 七、课后延伸");
  plan.followUp.forEach((item) => lines.push("- " + item));
  lines.push("", "## 八、知识来源如何转化");
  plan.sourceAlignment.forEach((item) => lines.push("- " + item));
  lines.push("", "## 九、学生支持与安全边界");
  plan.safeguardingNotes.forEach((item) => lines.push("- " + item));
  return lines.join("\n");
}
