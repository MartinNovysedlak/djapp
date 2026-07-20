/** Position of a multi-day event strip within a single day cell. */
export type SpanEdge = "single" | "start" | "middle" | "end";

export function getSpanEdge(
  dayIso: string,
  rangeStart: string,
  rangeEnd: string
): SpanEdge {
  if (rangeStart === rangeEnd) return "single";
  if (dayIso === rangeStart) return "start";
  if (dayIso === rangeEnd) return "end";
  return "middle";
}

/** Classes so strips visually bridge the gap between adjacent day cells. */
export function spanStripClass(edge: SpanEdge) {
  switch (edge) {
    case "start":
      return "rounded-l-md rounded-r-none -mr-1.5 pr-1.5";
    case "middle":
      return "rounded-none -mx-1.5 px-1.5";
    case "end":
      return "rounded-r-md rounded-l-none -ml-1.5 pl-1.5";
    default:
      return "rounded-md";
  }
}

/** Show label on first day of a span (and single-day events). */
export function showSpanLabel(edge: SpanEdge) {
  return edge === "single" || edge === "start";
}
