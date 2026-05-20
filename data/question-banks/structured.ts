import type { InterviewBank } from "./types";

export const civilServiceStructuredBank: InterviewBank = {
  id: "civil-service-structured",
  name: "公务员 / 选调结构化面试",
  description: "覆盖国考、省考、选调、人才引进等结构化真题",
  targetUsers: "公务员、选调生、人才引进、综合管理岗考生",
  category: "公考事业编",
  icon: "🏛️",
  badge: "结构化",
  accentColor: "blue",
  questions: [],
};

export const publicInstitutionBank: InterviewBank = {
  id: "public-institution",
  name: "事业单位结构化面试",
  description: "覆盖事业单位、社区、医疗、教师、乡镇基层等高频真题",
  targetUsers: "事业单位、社区工作者、教师岗、医疗卫生岗、基层岗位考生",
  category: "公考事业编",
  icon: "🏢",
  badge: "大题库",
  accentColor: "cyan",
  questions: [],
};

export const stateOwnedEnterpriseBank: InterviewBank = {
  id: "state-owned-enterprise",
  name: "国企 / 银行结构化面试",
  description: "覆盖国企央企、银行系统、电力系统等结构化面试题",
  targetUsers: "国企央企、银行、国家电网、电力系统与窗口服务岗位考生",
  category: "国企银行",
  icon: "🏦",
  badge: "热门",
  accentColor: "green",
  questions: [],
};

export const campusRecruitmentStructuredBank: InterviewBank = {
  id: "campus-recruitment",
  name: "校园招聘结构化面试",
  description: "覆盖校招、实习、应届生求职中的结构化表达与岗位认知题",
  targetUsers: "应届生、实习生、校招候选人",
  category: "校园求职",
  icon: "🎓",
  badge: "校招",
  accentColor: "purple",
  questions: [],
};

export const privateCompanyStructuredBank: InterviewBank = {
  id: "private-company",
  name: "企业综合结构化面试",
  description: "覆盖民企、私企和综合岗位的结构化沟通与岗位匹配题",
  targetUsers: "民企私企、综合管理、运营、职能类岗位候选人",
  category: "企业求职",
  icon: "💬",
  badge: "新增",
  accentColor: "pink",
  questions: [],
};

export const structuredQuestionBanks = [
  civilServiceStructuredBank,
  publicInstitutionBank,
  stateOwnedEnterpriseBank,
  campusRecruitmentStructuredBank,
  privateCompanyStructuredBank,
];
