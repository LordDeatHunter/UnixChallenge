import { createMemo } from "solid-js";
import type { Component } from "solid-js";
import type { TestResult } from "@/types";

interface TestResultItemProps {
  test: TestResult;
  index: number;
  onSelect: (test: TestResult) => void;
  isSelected?: boolean;
}

const TestResultItem: Component<TestResultItemProps> = (props) => {
  const statusText = createMemo(() =>
    props.test.pass
      ? `Finished in ${props.test.elapsed_ms}ms`
      : `Failed in ${props.test.elapsed_ms}ms`,
  );

  return (
    <div
      class={`test-result ${props.test.pass ? "test-pass" : "test-fail"}`}
      classList={{
        "test-selected": props.isSelected,
      }}
      onClick={() => props.onSelect(props.test)}
    >
      <span class="test-index">{props.index + 1}.</span>
      <span class="test-status">{props.test.pass ? "✔" : "✘"}</span>
      <span class="test-description">{statusText()}</span>
    </div>
  );
};

export default TestResultItem;
