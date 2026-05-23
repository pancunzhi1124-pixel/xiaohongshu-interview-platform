export type ExternalInfoLink = {
  title: string;
  shortTitle: string;
  tag: string;
  description: string;
  buttonText: string;
  url: string;
  updateNote: string;
};

export const externalInfoLinks = {
  campusRecruitment: {
    title: "高校校园招聘信息库",
    shortTitle: "校招信息库",
    tag: "校园招聘",
    description: "汇总高校校园招聘、宣讲会、岗位表、报名时间及相关附件。",
    buttonText: "查看校招信息",
    url: "https://kcnrqqpruo3a.feishu.cn/base/Hmiibiihoav4SXs56Ufc6DkEnxq?table=tblmZUlIlvcSgH3V&view=vew9fn2Zdf",
    updateNote: "每日更新，节假日不更新",
  },
  examAndEnterprise: {
    title: "地区考试 / 国企央企 / 省考信息库",
    shortTitle: "考试 / 国企 / 省考信息库",
    tag: "考试公告",
    description: "汇总省考、事业单位、国企央企、银行、选调等考试与招聘信息。",
    buttonText: "查看考试信息",
    url: "https://dxhyhkaedeu.feishu.cn/wiki/SMzBw3ylCiCCwZkkHdgcnXAfnUg?table=ldx1hDaVHqfDa8C4",
    updateNote: "每日更新，节假日不更新",
  },
} satisfies Record<"campusRecruitment" | "examAndEnterprise", ExternalInfoLink>;
