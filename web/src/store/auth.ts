import { createSignal } from "solid-js";
import type { User } from "@/types";
import { API_URL } from "./config";

export const [currentUser, setCurrentUser] = createSignal<User | null>(null);
export const [isLoadingUser, setIsLoadingUser] = createSignal(true);

export const loadCurrentUser = async () => {
  setIsLoadingUser(true);
  try {
    const response = await fetch(`${API_URL}/me`, { credentials: "include" });
    const data = (await response.json()) as User | null;
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
