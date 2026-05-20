export type ExamType =
  | "national-civil-service"
  | "provincial-civil-service"
  | "public-institution"
  | "state-owned-enterprise"
  | "private-company";

export const examTypeCategories: Array<{
  id: ExamType;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  accentColor: string;
}> = [
  {
    id: "national-civil-service",
    name: "国考面试",
    shortName: "国考",
    description: "覆盖国家公务员、税务、海关、边检、中央机关等结构化面试真题。",
    icon: "🏛️",
    accentColor: "blue",
  },
  {
    id: "provincial-civil-service",
    name: "省考面试",
    shortName: "省考",
    description: "覆盖各省公务员、省直、市直、县区、选调生、遴选等面试真题。",
    icon: "🗺️",
    accentColor: "cyan",
  },
  {
    id: "public-institution",
    name: "事业编面试",
    shortName: "事业编",
    description: "覆盖事业单位、教师、医疗、社工、高校辅导员、基层岗位等面试真题。",
    icon: "🏢",
    accentColor: "purple",
  },
  {
    id: "state-owned-enterprise",
    name: "国企央企银行面试",
    shortName: "国企",
    description: "覆盖国企、央企、银行、农商行、国家电网、电力系统等面试真题。",
    icon: "🏦",
    accentColor: "green",
  },
  {
    id: "private-company",
    name: "私企民企面试",
    shortName: "私企",
    description: "覆盖互联网、电商、运营、销售、客服、产品、技术、财务、人事等企业招聘场景。",
    icon: "💼",
    accentColor: "orange",
  },
];

const nationalTitleKeywords = [
  "国家公务员",
  "国考",
  "中央机关",
  "中央国家机关",
  "国家税务",
  "国家税务总局",
  "海关",
  "边检",
  "出入境边防",
  "铁路公安",
  "银保监",
  "证监",
  "国家统计局",
  "消防救援总队",
];

const provincialTitleKeywords = [
  "省考",
  "公务员",
  "选调",
  "定向选调",
  "专项选调",
  "专额选调",
  "集中选调",
  "青选计划",
  "遴选",
  "转公",
  "紧缺专项公务员",
];

const publicInstitutionTitleKeywords = [
  "事业单位",
  "事业编",
  "人才引进",
  "招才引智",
  "社工",
  "社区工作者",
  "双百社工",
  "高校辅导员",
  "辅导员",
  "高校管理岗",
  "教师",
  "教师岗",
  "医疗",
  "卫生",
  "医院",
  "护理岗",
  "卫健委",
  "大学生村官",
  "村官",
  "三支一扶",
  "乡镇事业",
  "基层乡镇",
  "差额事业",
  "大学面试题",
  "管理岗面试题",
];

const stateOwnedTitleKeywords = [
  "国企",
  "央企",
  "国资",
  "银行",
  "农商行",
  "农信社",
  "建设银行",
  "工商银行",
  "农业银行",
  "中国银行",
  "交通银行",
  "邮储",
  "国家电网",
  "国网",
  "电网",
  "烟草",
  "铁路",
  "移动",
  "联通",
  "电信",
  "国航",
  "航空",
  "茅台",
  "粮食发展有限公司",
  "能源集团",
  "投资集团",
  "城投",
  "水务集团",
  "交投",
  "建投",
];

const privateCompanyTitleKeywords = [
  "私企",
  "民企",
  "民营",
  "互联网",
  "电商",
  "小红书",
  "腾讯",
  "阿里",
  "字节",
  "美团",
  "京东",
  "拼多多",
];

const stateOwnedJobKeywords = ["国企央企通用岗", "银行系统", "国家电网/电力系统"];
const nationalJobKeywords = ["税务系统", "海关/边检/公安系统"];
const publicInstitutionJobKeywords = [
  "社区工作者",
  "社工岗",
  "教师岗",
  "高校辅导员",
  "高校管理岗",
  "医疗卫生岗",
  "乡镇基层岗",
  "农业农村岗",
  "林草/生态环保岗",
  "应急管理岗",
  "窗口服务岗",
  "村干部/驻村干部",
  "人才引进综合岗",
];
const privateCompanyJobKeywords = ["运营", "电商", "销售", "客服", "产品", "技术", "数据分析", "财务", "人事"];

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

export function inferExamType(question: {
  bankId?: string;
  sourceTitle?: string;
  jobTags?: string[];
}): ExamType {
  const title = question.sourceTitle ?? "";
  const jobTags = (question.jobTags ?? []).join(" ");

  if (includesAny(title, stateOwnedTitleKeywords)) return "state-owned-enterprise";
  if (includesAny(title, nationalTitleKeywords)) return "national-civil-service";
  if (includesAny(title, publicInstitutionTitleKeywords)) return "public-institution";
  if (includesAny(title, provincialTitleKeywords)) return "provincial-civil-service";
  if (includesAny(title, privateCompanyTitleKeywords)) return "private-company";

  if (includesAny(jobTags, stateOwnedJobKeywords)) return "state-owned-enterprise";
  if (includesAny(jobTags, nationalJobKeywords)) return "national-civil-service";
  if (includesAny(jobTags, publicInstitutionJobKeywords)) return "public-institution";
  if (includesAny(jobTags, privateCompanyJobKeywords)) return "private-company";

  if (question.bankId === "state-owned-enterprise") return "state-owned-enterprise";
  if (question.bankId === "public-institution") return "public-institution";
  if (question.bankId === "civil-service-structured") return "provincial-civil-service";
  if (question.bankId === "campus-recruitment") return "private-company";
  if (question.bankId === "private-company") return "private-company";

  return "private-company";
}

export function getExamTypeName(examType: ExamType) {
  return examTypeCategories.find((category) => category.id === examType)?.name ?? "其他面试";
}
