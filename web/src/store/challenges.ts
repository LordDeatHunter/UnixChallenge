import { createSignal } from "solid-js";
import type { Challenge } from "@/types";
import { API_URL } from "./config";

export const [challenges, setChallenges] = createSignal<Challenge[]>([]);
export const [selectedChallengeId, setSelectedChallengeId] =
  createSignal<string>("");
export const [searchQuery, setSearchQuery] = createSignal<string>("");

export const selectedChallenge = () =>
  challenges().find((challenge) => challenge.id === selectedChallengeId());

export const filteredChallenges = () => {
  const query = searchQuery().toLowerCase();
  if (!query) {
    return challenges();
  }

  return challenges().filter(
    (challenge) =>
      challenge.title.toLowerCase().includes(query) ||
      challenge.description.toLowerCase().includes(query) ||
      challenge.tags.some((tag) => tag.toLowerCase().includes(query)),
  );
};

export const loadChallenges = async () => {
  try {
    const response = await fetch(`${API_URL}/challenges`, {
      credentials: "include",
    });
    const data = (await response.json()) as Challenge[];
    setChallenges(data);
  } catch (error) {
    console.error("Failed to load challenges:", error);
    setChallenges([]);
  }
};
