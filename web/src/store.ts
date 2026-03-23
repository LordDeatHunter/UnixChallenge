import { createSignal } from "solid-js";
import type { Challenge, Submission, SubmissionSummary, TestResult, User } from "@/types";

export const API_URL: string =
  (import.meta.env.VITE_API_URL as string) || "/api";

export const [challenges, setChallenges] = createSignal<Challenge[]>([]);
export const [selectedChallengeId, setSelectedChallengeId] =
  createSignal<string>("");
export const [cmd, setCmd] = createSignal<string>("");
export const [submission, setSubmission] = createSignal<Submission | null>(
  null,
);
export const [selectedTest, setSelectedTest] = createSignal<TestResult | null>(
  null,
);
export const [isRunning, setIsRunning] = createSignal(false);
export const [searchQuery, setSearchQuery] = createSignal<string>("");
export const [cheatQuery, setCheatQuery] = createSignal<string>("");
export const [cheatContent, setCheatContent] = createSignal<string>("");
export const [isLoadingCheat, setIsLoadingCheat] = createSignal(false);
export const [cheatError, setCheatError] = createSignal<string>("");

// Auth / user state
export const [currentUser, setCurrentUser] = createSignal<User | null>(null);
export const [isLoadingUser, setIsLoadingUser] = createSignal(true);
export const [userChallengeHistory, setUserChallengeHistory] = createSignal<SubmissionSummary[]>([]);
export const [isLoadingHistory, setIsLoadingHistory] = createSignal(false);

export const selectedChallenge = () =>
  challenges().find((c) => c.id === selectedChallengeId());

export const filteredChallenges = () => {
  const query = searchQuery().toLowerCase();
  if (!query) return challenges();

  return challenges().filter(
    (c) =>
      c.title.toLowerCase().includes(query) ||
      c.description.toLowerCase().includes(query) ||
      c.tags.some((tag) => tag.toLowerCase().includes(query)),
  );
};

export const loadChallenges = async () => {
  try {
    const res = await fetch(`${API_URL}/challenges`);
    const data = (await res.json()) as Challenge[];
    setChallenges(data);
  } catch (error) {
    console.error("Failed to load challenges:", error);
    setChallenges([]);
  }
};

export const runSubmission = async () => {
  if (!selectedChallengeId() || !cmd()) return;

  setIsRunning(true);
  setSelectedTest(null);
  setSubmission(null);

  try {
    const res = await fetch(`${API_URL}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        challenge_id: selectedChallengeId(),
        cmd: cmd(),
      }),
    });

    const data = (await res.json()) as Submission;
    setSubmission(data);
  } catch (error) {
    console.error("Submission failed:", error);
    setSubmission({ error: "Failed to submit" } as Submission);
  } finally {
    setIsRunning(false);
  }
};

export const fetchCheatSheet = async (query?: string) => {
  const searchQuery = query || cheatQuery();
  if (!searchQuery.trim()) {
    setCheatError("Please enter a command or topic");
    return;
  }

  setIsLoadingCheat(true);
  setCheatError("");
  setCheatContent("");

  try {
    // Use backend proxy to avoid CORS issues
    const response = await fetch(
      `${API_URL}/cheatsheet/${encodeURIComponent(searchQuery)}`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Command or topic not found");
    }

    const text = await response.text();
    setCheatContent(text);
  } catch (error) {
    console.error("Cheat.sh fetch failed:", error);
    setCheatError(
      error instanceof Error ? error.message : "Failed to fetch documentation",
    );
  } finally {
    setIsLoadingCheat(false);
  }
};

export const loadCurrentUser = async () => {
  setIsLoadingUser(true);
  try {
    const res = await fetch(`${API_URL}/me`, { credentials: "include" });
    const data = (await res.json()) as User | null;
    setCurrentUser(data);
  } catch {
    setCurrentUser(null);
  } finally {
    setIsLoadingUser(false);
  }
};

export const logout = async () => {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } finally {
    setCurrentUser(null);
  }
};

export const fetchUserChallengeHistory = async (challengeId: string) => {
  if (!currentUser()) return;
  setIsLoadingHistory(true);
  try {
    const res = await fetch(
      `${API_URL}/me/challenges/${encodeURIComponent(challengeId)}/submissions?limit=20`,
      { credentials: "include" },
    );
    const data = (await res.json()) as { submissions: SubmissionSummary[] };
    setUserChallengeHistory(data.submissions ?? []);
  } catch {
    setUserChallengeHistory([]);
  } finally {
    setIsLoadingHistory(false);
  }
};

export const loadHistoricalSubmission = async (submissionId: string) => {
  try {
    const res = await fetch(`${API_URL}/submissions/${submissionId}`, {
      credentials: "include",
    });
    const data = await res.json() as {
      id: string;
      results: Array<{
        test_num: string;
        exit_code: number;
        elapsed_ms: number;
        pass: boolean;
        stdout: string;
        stderr: string;
      }>;
      total_tests: number;
      passed: number;
      failed: number;
      all_pass: boolean;
    };

    setSubmission({
      summary: {
        run_id: data.id,
        total_tests: data.total_tests,
        passed: data.passed,
        failed: data.failed,
        all_pass: data.all_pass,
        results: data.results.map((r) => ({ ...r, expected: "" })),
      },
    });
  } catch (error) {
    console.error("Failed to load historical submission:", error);
  }
};
