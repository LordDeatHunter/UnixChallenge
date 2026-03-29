import { createSignal } from "solid-js";
import { API_URL } from "./config";

export const [cheatQuery, setCheatQuery] = createSignal<string>("");
export const [cheatContent, setCheatContent] = createSignal<string>("");
export const [isLoadingCheat, setIsLoadingCheat] = createSignal(false);
export const [cheatError, setCheatError] = createSignal<string>("");

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
