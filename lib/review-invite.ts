import { BRAND } from "@/lib/brand";

export type ReviewInvitePublic = {
  slug: string;
  bookingId: string;
  djId: string;
  djName: string | null;
  djAvatarUrl: string | null;
  eventType: string | null;
  eventDate: string | null;
  endDate: string | null;
  alreadyReviewed: boolean;
  /** False until the event end date has passed. */
  canSubmit: boolean;
};

/** Guest-facing review URL — always production domain. */
export function reviewInviteUrl(slug: string) {
  return `${BRAND.url.replace(/\/$/, "")}/hodnotenie/${slug}`;
}

export function makeReviewShareSlug() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
