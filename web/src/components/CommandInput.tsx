import { shouldPlayKeyboardSound } from "@/utils/commandInput";
import { playKeyboardSound } from "@/utils/keyboardAudio";
import type { Component, JSX } from "solid-js";

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
