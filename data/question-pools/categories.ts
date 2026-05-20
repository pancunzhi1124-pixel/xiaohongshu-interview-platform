export type ExamTypeCategory = {
  id: "national-civil-service" | "provincial-civil-service" | "public-institution" | "state-owned-enterprise" | "private-company";
  name: string;
  shortName: string;
  description: string;
  icon: string;
  accentColor: "blue" | "cyan" | "purple" | "green" | "orange";
};

export const examTypeCategories: ExamTypeCategory[] = [
  { id: "national-civil-service", name: "国考面试", shortName: "国考", description: "覆盖国家公务员、税务、海关、边检、公安、中央机关等结构化面试真题", icon: "🏛️", accentColor: "blue" },
  { id: "provincial-civil-service", name: "省考面试", shortName: "省考", description: "覆盖各省公务员、省直、市直、县区、选调生等面试真题", icon: "🗺️", accentColor: "cyan" },
  { id: "public-institution", name: "事业编面试", shortName: "事业编", description: "覆盖事业单位、教师、医疗、社区工作者、高校辅导员、基层岗位等", icon: "🏢", accentColor: "purple" },
  { id: "state-owned-enterprise", name: "国企央企银行面试", shortName: "国企", description: "覆盖国企、央企、银行、国家电网、电力系统、窗口服务岗等", icon: "🏦", accentColor: "green" },
  { id: "private-company", name: "私企民企面试", shortName: "私企", description: "覆盖运营、电商、产品、技术、销售、客服、财务、人事等企业招聘场景", icon: "💼", accentColor: "orange" },
];

export const examTypeCategoryMap = Object.fromEntries(examTypeCategories.map((x) => [x.id, x])) as Record<ExamTypeCategory["id"], ExamTypeCategory>;
