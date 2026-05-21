export type AnnouncementCategory = "regional-exam" | "campus-recruitment";
export type AnnouncementFileType = "pdf" | "excel";

export type Announcement = {
  id: string;
  title: string;
  category: AnnouncementCategory;
  date: string;
  description: string;
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
    fileType: "excel",
    fileName: "2025-campus-recruitment.xlsx",
    fileUrl: "/announcements/files/2025-campus-recruitment.xlsx",
    isAvailable: false,
  },
  {
    id: "regional-exam-2025-002",
    title: "2025 年省级事业单位统考节点更新",
    category: "regional-exam",
    date: "2025-05-18",
    description: "整理各省事业单位统考公告发布时间、资格审查与笔试安排。",
    fileType: "pdf",
    fileName: "2025-provincial-public-institutions.pdf",
    fileUrl: "/announcements/files/2025-provincial-public-institutions.pdf",
    isAvailable: false,
  },
  {
    id: "campus-recruitment-2025-002",
    title: "2025 届央国企校园招聘岗位清单",
    category: "campus-recruitment",
    date: "2025-05-15",
    description: "按行业分类汇总央国企校招岗位、网申入口与时间窗口。",
    fileType: "excel",
    fileName: "2025-soe-campus-jobs.xlsx",
    fileUrl: "/announcements/files/2025-soe-campus-jobs.xlsx",
    isAvailable: false,
  },
];
