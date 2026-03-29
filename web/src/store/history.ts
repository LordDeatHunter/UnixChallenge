import { createSignal } from "solid-js";
import type { SubmissionSummary } from "@/types";
import { currentUser } from "./auth";
import { API_URL } from "./config";

export const [userChallengeHistory, setUserChallengeHistory] =
  createSignal<SubmissionSummary[]>([]);
export const [isLoadingHistory, setIsLoadingHistory] = createSignal(false);

export const fetchUserChallengeHistory = async (challengeId: string) => {
  if (!currentUser()) {
    return;
  }

  setIsLoadingHistory(true);
  try {
    const response = await fetch(
      `${API_URL}/me/challenges/${encodeURIComponent(challengeId)}/submissions?limit=20`,
      { credentials: "include" },
    );
    const data = (await response.json()) as { submissions: SubmissionSummary[] };
    setUserChallengeHistory(data.submissions ?? []);
  } catch {
    setUserChallengeHistory([]);
  } finally {
    setIsLoadingHistory(false);
  }
};
