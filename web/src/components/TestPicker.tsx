import { type Component, createEffect, createMemo, createSignal, For, Show } from "solid-js";
import type { TestResult } from "@/types";

interface TestPickerProps {
  tests: TestResult[];
  selected: TestResult | null;
  isDisabled: boolean;
  onSelect: (test: TestResult) => void;
}

const TestPicker: Component<TestPickerProps> = (props) => {
  const [open, setOpen] = createSignal(false);
  let ref: HTMLDivElement | undefined;

  const statusClass = createMemo(() => {
    if (!props.selected) return "test-picker-neutral";
    return props.selected.pass ? "test-picker-pass" : "test-picker-fail";
  });

  const label = createMemo(() => {
    const selected = props.selected;
    if (!selected) {
      return props.tests.length > 0 ? "Select test" : "No tests available";
    }
    const index = props.tests.indexOf(selected);
    return `${selected.pass ? "[PASS]" : "[FAIL]"} Test ${index + 1}`;
  });

  createEffect(() => {
    if (!open()) return;

    const onMouseDown = (e: MouseEvent) => {
      if (ref && !ref.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  });

  createEffect(() => {
    if (props.isDisabled) setOpen(false);
  });

  return (
    <div class="test-picker" ref={ref}>
      <button
        type="button"
        class={`test-picker-trigger ${statusClass()}`}
        disabled={props.isDisabled}
        onClick={() => setOpen((prev) => !prev)}
      >
        {label()}
      </button>

      <Show when={open()}>
        <ul class="test-picker-menu" role="listbox">
          <For each={props.tests}>
            {(test, index) => {
              const isSelected = () => props.selected === test;
              return (
                <li
                  role="option"
                  aria-selected={isSelected()}
                  classList={{
                    "test-picker-option": true,
                    "test-picker-pass": test.pass,
                    "test-picker-fail": !test.pass,
                    "test-picker-selected": isSelected(),
                  }}
                  onClick={() => {
                    props.onSelect(test);
                    setOpen(false);
                  }}
                >
                  {test.pass ? "[PASS]" : "[FAIL]"} Test {index() + 1}
                </li>
              );
            }}
          </For>
        </ul>
      </Show>
    </div>
  );
};

export default TestPicker;
