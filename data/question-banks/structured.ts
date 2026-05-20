import type { InterviewBank } from "./types";

const createStructuredBank = (id: string, name: string, description: string, targetUsers: string, icon: string, accentColor: InterviewBank["accentColor"]): InterviewBank => ({
  id,
  name,
  description,
  targetUsers,
  category: "结构化面试",
  icon,
  accentColor,
  badge: "结构化题库",
  questions: [],
});

export const structuredCivilServiceBank = createStructuredBank(
  "civil-service-structured",
  "公务员 / 选调结构化面试",
  "覆盖省考、国考、选调等结构化高频题型。",
  "公务员、选调生、基层治理岗位备考人群",
  "🏛️",
  "cyan",
);

export const structuredPublicInstitutionBank = createStructuredBank(
  "public-institution",
  "事业单位结构化面试",
  "聚焦事业单位综合岗、教师岗、医疗岗等结构化问答。",
  "事业编、教师编、医疗卫生岗备考人群",
  "📚",
  "green",
);

export const structuredStateOwnedBank = createStructuredBank(
  "state-owned-enterprise",
  "国企 / 银行结构化面试",
  "覆盖国企央企、政策性银行与商业银行常见结构化题。",
  "国企、银行、电网等系统招聘人群",
  "🏦",
  "blue",
);

export const structuredCampusRecruitmentBank = createStructuredBank(
  "campus-recruitment",
  "校园招聘结构化面试",
  "适配校招场景，突出表达逻辑、岗位匹配与潜力评估。",
  "应届生、校招求职人群",
  "🎓",
  "purple",
);

export const structuredPrivateCompanyBank = createStructuredBank(
  "private-company",
  "企业综合结构化面试",
  "覆盖民企通用管理岗、业务岗常见结构化面试问题。",
  "社招、转岗与企业综合岗位求职人群",
  "🏢",
  "indigo",
);

export const structuredInterviewBanks: InterviewBank[] = [
  structuredCivilServiceBank,
  structuredPublicInstitutionBank,
  structuredStateOwnedBank,
  structuredCampusRecruitmentBank,
  structuredPrivateCompanyBank,
];
