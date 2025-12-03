import { createSignal } from "solid-js";
import type { Challenge, Submission, TestResult } from "@/types";

export const API_URL = "http://127.0.0.1:8000";

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
    const data = await res.json();
    setChallenges(data);
  } catch (error) {
    console.error("Failed to load challenges:", error);
  }
};

export const runSubmission = async () => {
  if (!selectedChallengeId() || !cmd()) return;

  setIsRunning(true);
  setSelectedTest(null);

  try {
    const res = await fetch(`${API_URL}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        challenge_id: selectedChallengeId(),
        cmd: cmd(),
      }),
    });

    const data = await res.json();
    setSubmission(data);
  } catch (error) {
    console.error("Submission failed:", error);
    setSubmission({ error: "Failed to submit" });
  } finally {
    setIsRunning(false);
  }
};
