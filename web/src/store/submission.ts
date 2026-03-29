import { createSignal } from "solid-js";
import type { Submission, SubmissionSummary, TestResult } from "@/types";
import { currentUser } from "./auth";
import { API_URL } from "./config";
import { fetchUserChallengeHistory } from "./history";
import { selectedChallengeId } from "./challenges";

export const [cmd, setCmd] = createSignal<string>("");
export const [submission, setSubmission] = createSignal<Submission | null>(
  null,
);
export const [selectedTest, setSelectedTest] = createSignal<TestResult | null>(
  null,
);
export const [isRunning, setIsRunning] = createSignal(false);

export const loadLastSubmittedCmd = async (
  challengeId: string,
): Promise<string> => {
  if (!challengeId || !currentUser()) {
    return "";
  }

  try {
    const response = await fetch(
      `${API_URL}/me/challenges/${encodeURIComponent(challengeId)}/submissions?limit=1`,
      { credentials: "include" },
    );

    if (!response.ok) {
      return "";
    }

    const data = (await response.json()) as { submissions?: SubmissionSummary[] };
    return data.submissions?.[0]?.command ?? "";
  } catch {
    return "";
  }
};

export const runSubmission = async () => {
  const challengeId = selectedChallengeId();
  const command = cmd();

  if (!challengeId || !command) {
    return;
  }

  setIsRunning(true);
  setSelectedTest(null);
  setSubmission(null);

  try {
    const response = await fetch(`${API_URL}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        challenge_id: challengeId,
        cmd: command,
      }),
    });

    const data = (await response.json()) as Submission;
    setSubmission(data);

    if (data.summary && currentUser()) {
      void fetchUserChallengeHistory(challengeId);
    }
  } catch (error) {
    console.error("Submission failed:", error);
    setSubmission({ error: "Failed to submit" } as Submission);
  } finally {
    setIsRunning(false);
  }
};

export const loadHistoricalSubmission = async (submissionId: string) => {
  if (!currentUser()) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/me/submissions/${submissionId}`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Submission not found");
    }

    const data = (await response.json()) as {
      id: string;
      command: string;
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

    setCmd(data.command);
    setSubmission({
      summary: {
        run_id: data.id,
        total_tests: data.total_tests,
        passed: data.passed,
        failed: data.failed,
        all_pass: data.all_pass,
        results: data.results.map((result) => ({ ...result, expected: "" })),
      },
    });
  } catch (error) {
    console.error("Failed to load historical submission:", error);
  }
};
