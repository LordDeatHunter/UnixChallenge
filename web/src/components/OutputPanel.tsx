import type { Component } from "solid-js";
import type { TestResult } from "@/types";

interface OutputPanelProps {
  selectedTest: TestResult | null;
}

const OutputPanel: Component<OutputPanelProps> = (props) => (
  <div class="output-panel">
    <h3>Expected</h3>
    <pre id="expected-output">{props.selectedTest?.expected || ""}</pre>

    <h3>Stdout</h3>
    <pre id="stdout">{props.selectedTest?.stdout || ""}</pre>

    <h3>Stderr</h3>
    <pre id="stderr">{props.selectedTest?.stderr || ""}</pre>
  </div>
);

export default OutputPanel;
