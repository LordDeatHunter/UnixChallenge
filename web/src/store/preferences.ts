import { createSignal } from "solid-js";

const KEYBOARD_SFX_STORAGE_KEY = "unixchallenge.keyboard-sfx-enabled";

const getStoredKeyboardSoundsEnabled = () => {
  if (typeof window === "undefined") {
    return true;
  }

  const storedValue = window.localStorage.getItem(KEYBOARD_SFX_STORAGE_KEY);
  if (storedValue === null) {
    return true;
  }

  return storedValue === "true";
};

export const [keyboardSoundsEnabled, setKeyboardSoundsEnabledSignal] =
  createSignal<boolean>(getStoredKeyboardSoundsEnabled());

export const setKeyboardSoundsEnabled = (enabled: boolean) => {
  setKeyboardSoundsEnabledSignal(enabled);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEYBOARD_SFX_STORAGE_KEY, String(enabled));
  }
};
