import type { TimelineItem } from "@/lib/timeline/types";
import { formatTimelineTime } from "@/lib/timeline/format";

/** Sort by sort_order, then timed items by clock time. */
export function sortTimelineItems(items: TimelineItem[]): TimelineItem[] {
  return [...items].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    const ta = formatTimelineTime(a.event_time);
    const tb = formatTimelineTime(b.event_time);
    if (ta && tb) return ta.localeCompare(tb);
    if (ta && !tb) return -1;
    if (!ta && tb) return 1;
    return a.created_at.localeCompare(b.created_at);
  });
}

export function formatTimelineTimeRange(
  start: string | null | undefined,
  end: string | null | undefined
): string {
  const s = formatTimelineTime(start);
  const e = formatTimelineTime(end);
  if (s && e) return `${s}–${e}`;
  if (s) return s;
  return "";
}
