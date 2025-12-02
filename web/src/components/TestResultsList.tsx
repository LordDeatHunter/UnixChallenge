import { Component, For, Show } from "solid-js";
import { TestResult } from "../types";
import TestResultItem from "./TestResultItem";

interface TestResultsListProps {
  results: TestResult[] | undefined;
  isRunning: boolean;
  error: string | undefined;
  onSelectTest: (test: TestResult) => void;
}

const TestResultsList: Component<TestResultsListProps> = (props) => (
  <div id="test-results">
    <Show
      when={props.results}
      fallback={props.isRunning ? "Running..." : "No tests run yet."}
    >
      <For each={props.results}>
        {(test, index) => (
          <TestResultItem
            test={test}
            index={index()}
            onSelect={props.onSelectTest}
          />
        )}
      </For>
    </Show>
    <Show when={props.error}>
      <div style="color: #ff4b4b;">Error: {props.error}</div>
    </Show>
  </div>
);

export default TestResultsList;
