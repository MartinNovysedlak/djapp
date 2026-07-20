"use server";

import { createClient as createSSRClient } from "@/utils/supabase/server";

export type ReviewVoteValue = 1 | -1;

export type SetReviewVoteResult = {
  ok: boolean;
  error?: string;
  /** Current vote after the action — null means removed. */
  vote?: ReviewVoteValue | null;
};

/**
 * Toggle like/dislike on a review. Same vote again removes it; opposite switches.
 */
export async function setReviewVote(
  reviewId: string,
  vote: ReviewVoteValue
): Promise<SetReviewVoteResult> {
  if (!reviewId || (vote !== 1 && vote !== -1)) {
    return { ok: false, error: "Neplatný hlas." };
  }

  try {
    const supabase = await createSSRClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return { ok: false, error: "Pre hlasovanie sa musíš prihlásiť." };
    }

    const userId = authData.user.id;

    const { data: existing } = await supabase
      .from("review_votes")
      .select("id, vote")
      .eq("review_id", reviewId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing && existing.vote === vote) {
      const { error } = await supabase
        .from("review_votes")
        .delete()
        .eq("id", existing.id);
      if (error) {
        return { ok: false, error: error.message };
      }
      return { ok: true, vote: null };
    }

    const { error } = await supabase.from("review_votes").upsert(
      {
        review_id: reviewId,
        user_id: userId,
        vote,
      },
      { onConflict: "review_id,user_id" }
    );

    if (error) {
      console.error("[setReviewVote]", error);
      return { ok: false, error: error.message };
    }

    return { ok: true, vote };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neznáma chyba.";
    console.error("[setReviewVote]", err);
    return { ok: false, error: message };
  }
}
