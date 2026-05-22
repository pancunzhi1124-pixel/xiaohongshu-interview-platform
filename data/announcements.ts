export type AnnouncementCategory = "regional-exam" | "campus-recruitment";
export type AnnouncementFileType = "pdf" | "excel";

export type Announcement = {
  id: string;
  title: string;
  category: AnnouncementCategory;
  date: string;
  description: string;
  detail?: string;
  fileType: AnnouncementFileType;
  fileName: string;
  fileUrl: string;
  isAvailable?: boolean;
};

export const announcementCategoryLabels: Record<AnnouncementCategory, string> = {
  "regional-exam": "地区考试",
  "campus-recruitment": "校园招聘",
};

export const announcementFileTypeLabels: Record<AnnouncementFileType, string> = {
  pdf: "PDF",
  excel: "Excel",
};

export const announcements: Announcement[] = [
  {
    id: "regional-exam-2025-001",
    title: "2025 年各地区考试信息汇总",
    category: "regional-exam",
    date: "2025-05-21",
    description: "汇总近期各地区考试公告、报名时间、考试安排及相关附件。",
    detail: "本公告汇总了近期各地区考试动态，包括招录公告发布时间、报名与资格审核节点、笔面试安排及附件下载说明。请考生结合目标地区政策，按时间轴完成报名、准考证打印与材料准备。",
    fileType: "pdf",
    fileName: "2025-regional-exam-info.pdf",
    fileUrl: "/announcements/files/2025-regional-exam-info.pdf",
    isAvailable: false,
  },
  {
    id: "campus-recruitment-2025-001",
    title: "2025 年高校校园招聘信息汇总",
    category: "campus-recruitment",
    date: "2025-05-21",
    description: "汇总高校校园招聘、宣讲会、岗位表及报名信息。",
    detail: "本公告重点覆盖高校校园招聘进展，包含宣讲会场次、岗位目录、网申入口与时间节点。建议同学按专业方向筛选岗位，优先锁定截止时间较近的岗位并及时提交材料。",
    fileType: "excel",
    fileName: "2025-campus-recruitment.xlsx",
    fileUrl: "/announcements/files/2025-campus-recruitment.xlsx",
    isAvailable: false,
  },
  {
    id: "regional-exam-2025-002",
    title: "2025 年下半年省市事业单位考试安排",
    category: "regional-exam",
    date: "2025-05-16",
    description: "整理下半年事业单位考试时间节点、资格条件与岗位变化提醒。",
    detail: "公告整理了 2025 年下半年省市事业单位考试关键节点，包括公告发布、报名、笔试、资格复审与面试阶段。请重点关注报考条件变化和岗位要求调整，提前准备资格证明材料。",
    fileType: "pdf",
    fileName: "regional-exam-schedule-2025-h2.pdf",
    fileUrl: "/announcements/files/regional-exam-schedule-2025-h2.pdf",
    isAvailable: false,
  },
  {
    id: "campus-recruitment-2025-002",
    title: "2025 年重点高校春招岗位表更新",
    category: "campus-recruitment",
    date: "2025-05-12",
    description: "更新重点高校春招岗位、投递截止时间和宣讲行程安排。",
    detail: "本次更新聚焦重点高校春招岗位变动，新增与调整了部分岗位职责、投递截止时间及宣讲安排。建议同学结合岗位要求完善简历内容，并在截止前完成网申和测评。",
    fileType: "excel",
    fileName: "campus-recruitment-key-universities-2025.xlsx",
    fileUrl: "/announcements/files/campus-recruitment-key-universities-2025.xlsx",
    isAvailable: false,
  },
];
