import { NoticeFeed, type NoticePage } from "@/utils/notice-feed";
import { api } from "@/utils/api";

export const notices = new NoticeFeed(
  (before) => api<NoticePage>(`/notices${before ? `?before=${encodeURIComponent(before)}` : ""}`),
  (id) => api(`/notices/${encodeURIComponent(id)}/read`, { method: "POST" }),
);
export const useNotices = notices.store.use;
