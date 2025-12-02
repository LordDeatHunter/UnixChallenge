import { Component } from "solid-js";

interface CommandInputProps {
  value: string;
  onInput: (value: string) => void;
  onSubmit: () => void;
}

const CommandInput: Component<CommandInputProps> = (props) => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      props.onSubmit();
    }
  };

  return (
    <div class="input-div">
      <textarea
        id="cmd"
        placeholder='e.g. echo "hello world"'
        spellcheck={false}
        value={props.value}
        onInput={(e) => props.onInput(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
      />
      <div class="scanlines"></div>
    </div>
  );
};

export default CommandInput;
