import { type Component, For, Show } from "solid-js";
import TestResultItem from "@/components/TestResultItem";
import type { TestResult } from "@/types";

interface TestResultsListProps {
  results: TestResult[] | undefined;
  isRunning: boolean;
  error: string | undefined;
  onSelectTest: (test: TestResult) => void;
  selectedTest: TestResult | null | undefined;
}

const TestResultsList: Component<TestResultsListProps> = (props) => (
  <div id="test-results">
    <Show when={!props.isRunning} fallback="Running...">
      <Show when={props.results} fallback="No tests run yet.">
        <For each={props.results}>
          {(test, index) => (
            <TestResultItem
              test={test}
              index={index()}
              onSelect={props.onSelectTest}
              isSelected={props.selectedTest?.test_num === test.test_num}
            />
          )}
        </For>
      </Show>
    </Show>
    <Show when={props.error}>
      <div style="color: #ff4b4b;">Error: {props.error}</div>
    </Show>
  </div>
);

export default TestResultsList;
