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

export const announcements: Announcement[] = [];
