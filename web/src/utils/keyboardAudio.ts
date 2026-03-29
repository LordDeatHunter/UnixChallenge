import { keyboardSoundsEnabled } from "@/store/preferences";

const KEYBOARD_SOUND_SOURCES = Array.from(
  { length: 7 },
  (_, index) => `/assets/sfx/keyboard_${index + 1}.wav`,
);

const keyboardSoundPool =
  typeof Audio === "undefined"
    ? []
    : KEYBOARD_SOUND_SOURCES.map((src) => {
        const audio = new Audio(src);
        audio.preload = "auto";
        audio.volume = 0.35;
        return audio;
      });

export const playKeyboardSound = () => {
  if (!keyboardSoundsEnabled() || keyboardSoundPool.length === 0) {
    return;
  }

  const baseAudio =
    keyboardSoundPool[Math.floor(Math.random() * keyboardSoundPool.length)];
  const audio = baseAudio.cloneNode(true);

  if (!(audio instanceof HTMLAudioElement)) {
    return;
  }

  audio.volume = baseAudio.volume;
  void audio.play().catch(() => {
    // Ignore playback failures caused by browser policies or interrupted audio.
  });
};
