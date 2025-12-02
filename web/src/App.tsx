import { Component, createSignal, For, onMount, Show } from "solid-js";

interface Challenge {
  id: string;
  title: string;
  description: string;
  tags: string[];
}

interface TestResult {
  test_num: string;
  exit_code: number;
  elapsed_ms: number;
  pass: boolean;
  stdout: string;
  stderr: string;
  expected: string;
}

interface Submission {
  summary?: {
    run_id: string;
    total_tests: number;
    passed: number;
    failed: number;
    all_pass: boolean;
    results: TestResult[];
  };
  error?: string;
}

const API_URL = "http://127.0.0.1:8000";

const App: Component = () => {
  const [challenges, setChallenges] = createSignal<Challenge[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] =
    createSignal<string>("");
  const [cmd, setCmd] = createSignal<string>("");
  const [submission, setSubmission] = createSignal<Submission | null>(null);
  const [selectedTest, setSelectedTest] = createSignal<TestResult | null>(null);
  const [isRunning, setIsRunning] = createSignal(false);

  const selectedChallenge = () =>
    challenges().find((c) => c.id === selectedChallengeId());

  const loadChallenges = async () => {
    try {
      const res = await fetch(`${API_URL}/challenges`);
      const data = await res.json();
      setChallenges(data);
      if (data.length > 0) {
        setSelectedChallengeId(data[0].id);
      }
    } catch (error) {
      console.error("Failed to load challenges:", error);
    }
  };

  const runSubmission = async () => {
    if (!selectedChallengeId() || !cmd()) return;

    setIsRunning(true);
    setSelectedTest(null);

    try {
      const res = await fetch(`${API_URL}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: selectedChallengeId(),
          cmd: cmd(),
        }),
      });

      const data = await res.json();
      setSubmission(data);
    } catch (error) {
      console.error("Submission failed:", error);
      setSubmission({ error: "Failed to submit" });
    } finally {
      setIsRunning(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      runSubmission();
    }
  };

  const handleChallengeChange = (id: string) => {
    setSelectedChallengeId(id);
    setSubmission(null);
    setSelectedTest(null);
  };

  onMount(() => {
    loadChallenges();
  });

  return (
    <>
      <h1>Unix Challenge (name subject to change)</h1>

      <div class="challenge-row">
        <label for="challenge-select">Challenge</label>
        <select
          id="challenge-select"
          value={selectedChallengeId()}
          onChange={(e) => handleChallengeChange(e.currentTarget.value)}
        >
          <For each={challenges()}>
            {(challenge) => (
              <option value={challenge.id}>
                {challenge.title
                  ? `${challenge.title} (${challenge.id})`
                  : challenge.id}
              </option>
            )}
          </For>
        </select>

        <div class="tags-container">
          <For each={selectedChallenge()?.tags || []}>
            {(tag) => <span class="tag">{tag}</span>}
          </For>
        </div>

        <pre id="challenge-description">
          {selectedChallenge()?.description || ""}
        </pre>

        <label>Command</label>
        <div class="input-div">
          <textarea
            id="cmd"
            placeholder='e.g. echo "hello world"'
            spellcheck={false}
            value={cmd()}
            onInput={(e) => setCmd(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
          />
          <div class="scanlines"></div>
        </div>
      </div>

      <div class="row">
        <div>
          <h3>Tests</h3>
          <div id="test-results">
            <Show
              when={submission()?.summary}
              fallback={isRunning() ? "Running..." : "No tests run yet."}
            >
              <For each={submission()?.summary?.results || []}>
                {(test, index) => (
                  <div
                    class={`test-result ${test.pass ? "test-pass" : "test-fail"}`}
                    onClick={() => setSelectedTest(test)}
                  >
                    <span class="test-index">{index() + 1}.</span>
                    <span class="test-status">{test.pass ? "✔" : "✘"}</span>
                    <span class="test-description">
                      {test.pass
                        ? `Finished in ${test.elapsed_ms}ms`
                        : `Failed in ${test.elapsed_ms}ms`}
                    </span>
                  </div>
                )}
              </For>
            </Show>
            <Show when={submission()?.error}>
              <div style="color: #ff4b4b;">Error: {submission()?.error}</div>
            </Show>
          </div>
        </div>

        <div>
          <h3>Expected</h3>
          <pre id="expected-output">{selectedTest()?.expected || ""}</pre>

          <h3>Stdout</h3>
          <pre id="stdout">{selectedTest()?.stdout || ""}</pre>

          <h3>Stderr</h3>
          <pre id="stderr">{selectedTest()?.stderr || ""}</pre>
        </div>
      </div>
    </>
  );
};

export default App;
