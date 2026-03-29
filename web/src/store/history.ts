import { createSignal } from "solid-js";
import type { SubmissionSummary } from "@/types";
import { currentUser } from "./auth";
import { API_URL } from "./config";

export const [userChallengeHistory, setUserChallengeHistory] =
  createSignal<SubmissionSummary[]>([]);
export const [isLoadingHistory, setIsLoadingHistory] = createSignal(false);

export const fetchUserChallengeHistory = async (
  challengeId: string,
): Promise<SubmissionSummary[]> => {
  if (!currentUser()) {
    return [];
  }

  setIsLoadingHistory(true);
  try {
    const response = await fetch(
      `${API_URL}/me/challenges/${encodeURIComponent(challengeId)}/submissions?limit=20`,
      { credentials: "include" },
    );
    const data = (await response.json()) as { submissions: SubmissionSummary[] };
    const submissions = data.submissions ?? [];
    setUserChallengeHistory(submissions);
    return submissions;
  } catch {
    setUserChallengeHistory([]);
    return [];
  } finally {
    setIsLoadingHistory(false);
  }
};
