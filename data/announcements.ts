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
    title: "2025 年下半年省市事业单位考试安排",
    category: "regional-exam",
    date: "2025-05-16",
    description: "整理下半年事业单位考试时间节点、资格条件与岗位变化提醒。",
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
    fileType: "excel",
    fileName: "campus-recruitment-key-universities-2025.xlsx",
    fileUrl: "/announcements/files/campus-recruitment-key-universities-2025.xlsx",
    isAvailable: false,
  },
];
