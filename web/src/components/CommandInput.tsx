import type { Component, JSX } from "solid-js";
import { keyboardSoundsEnabled } from "@/store";

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

const shouldPlayKeyboardSound = (event: KeyboardEvent) => {
  if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) {
    return false;
  }

  return (
    event.key.length === 1 ||
    event.key === "Backspace" ||
    event.key === "Delete" ||
    event.key === "Enter"
  );
};

const playKeyboardSound = () => {
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

interface CommandInputProps {
  value: string;
  onInput: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const CommandInput: Component<CommandInputProps> = (props) => {
  const handleKeyDown: JSX.EventHandler<HTMLTextAreaElement, KeyboardEvent> = (e) => {
    if (props.isSubmitting) {
      return;
    }

    if (shouldPlayKeyboardSound(e)) {
      playKeyboardSound();
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      props.onSubmit();
    }
  };

  return (
    <div class="command-input">
      <div class="input-div">
        <textarea
          id="cmd"
          placeholder='e.g. echo "hello world"'
          spellcheck={false}
          value={props.value}
          onInput={(e) => props.onInput(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
        />
        <div class="scanlines" />
      </div>

      <button
        type="button"
        class="command-submit-button"
        disabled={props.isSubmitting}
        aria-busy={props.isSubmitting}
        onClick={() => props.onSubmit()}
      >
        {props.isSubmitting ? "Submitting..." : "Submit"}
      </button>
    </div>
  );
};

export default CommandInput;
