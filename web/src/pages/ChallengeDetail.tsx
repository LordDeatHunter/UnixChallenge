import {
  type Component,
  createEffect,
  createMemo,
  For,
  onMount,
  Show,
} from "solid-js";
import { useParams } from "@solidjs/router";
import TagsDisplay from "@/components/TagsDisplay";
import CommandInput from "@/components/CommandInput";
import {
  challenges,
  cmd,
  isRunning,
  loadChallenges,
  runSubmission,
  selectedChallenge,
  selectedTest,
  setCmd,
  setSelectedChallengeId,
  setSelectedTest,
  setSubmission,
  submission,
} from "@/store";
import CheatSheet from "@/components/CheatSheet";
import SiteHeader from "@/components/SiteHeader";

const ChallengeDetail: Component = () => {
  const params = useParams<{ id: string }>();

  const testResults = createMemo(() => submission()?.summary?.results ?? []);

  const passSummary = createMemo(() => {
    const summary = submission()?.summary;
    if (!summary) {
      return "No run yet";
    }

    return `${summary.passed}/${summary.total_tests} passed`;
  });

  const selectedTestStatusClass = createMemo(() => {
    if (isRunning() || testResults().length === 0) {
      return "test-select-neutral";
    }

    const test = selectedTest();
    if (!test) {
      return "test-select-neutral";
    }

    return test.pass ? "test-select-pass" : "test-select-fail";
  });

  createEffect(() => {
    const tests = testResults();
    const current = selectedTest();

    if (!tests.length) {
      if (current) {
        setSelectedTest(null);
      }
      return;
    }

    if (!current) {
      setSelectedTest(tests[0]);
      return;
    }

    const matchingCurrent = tests.find((test) => test.test_num === current.test_num);

    if (!matchingCurrent) {
      setSelectedTest(tests[0]);
      return;
    }

    if (matchingCurrent !== current) {
      setSelectedTest(matchingCurrent);
    }
  });

  const handleSelectedTestChange = (value: string) => {
    const next = testResults().find((test) => test.test_num === value);
    if (next) {
      setSelectedTest(next);
    }
  };

  onMount(() => {
    if (challenges().length === 0) {
      void loadChallenges();
    }

    setSelectedChallengeId(params.id);
    setSubmission(null);
    setSelectedTest(null);
  });

  return (
    <>
      <SiteHeader title={selectedChallenge()?.title || "Challenge"} />

      <div class="challenge-detail-page">
        <Show
        when={selectedChallenge()}
        fallback={
          <div>
            <h2>Challenge not found</h2>
            <p>The challenge you're looking for doesn't exist.</p>
          </div>
        }
      >
        {(challenge) => (
          <div class="challenge-detail-layout">
            <section class="challenge-panel challenge-description-panel">
              <h3>Overview</h3>
              <TagsDisplay tags={challenge().tags} />

              <pre id="challenge-description">{challenge().description}</pre>
            </section>

            <section class="challenge-panel challenge-command-panel">
              <label>Command</label>
              <p class="command-help">
                Press Enter to submit. Use Shift+Enter for a newline.
              </p>
              <CommandInput
                value={cmd()}
                onInput={setCmd}
                onSubmit={() => void runSubmission()}
                isSubmitting={isRunning()}
              />
            </section>

            <section class="challenge-panel challenge-results-panel">
              <div class="challenge-results-header">
                <h3>
                  Execution Results
                  <span class="results-summary">{passSummary()}</span>
                </h3>
                <div class="results-test-picker">
                  <label for="selected-test">Test</label>
                  <select
                    id="selected-test"
                    class={selectedTestStatusClass()}
                    value={selectedTest()?.test_num || ""}
                    onChange={(e) => handleSelectedTestChange(e.currentTarget.value)}
                    disabled={isRunning() || testResults().length === 0}
                  >
                    <option value="" disabled={testResults().length > 0}>
                      {isRunning()
                        ? "Waiting for results..."
                        : testResults().length > 0
                          ? "Select test"
                          : "No tests available"}
                    </option>
                    <For each={testResults()}>
                      {(test, index) => (
                        <option value={test.test_num}>
                          {test.pass ? "[PASS]" : "[FAIL]"} Test {index() + 1}
                        </option>
                      )}
                    </For>
                  </select>
                </div>
              </div>

              <div class="challenge-results-content">
                <Show
                  when={selectedTest()}
                  fallback={<pre>Select a test to inspect outputs.</pre>}
                >
                  {(test) => (
                    <table class="result-output-table">
                      <tbody>
                        <tr>
                          <th scope="row">Expected</th>
                          <td>
                            <pre>{test().expected || ""}</pre>
                          </td>
                        </tr>
                        <tr>
                          <th scope="row">Stdout</th>
                          <td>
                            <pre>{test().stdout || ""}</pre>
                          </td>
                        </tr>
                        <tr>
                          <th scope="row">Stderr</th>
                          <td>
                            <pre>{test().stderr || ""}</pre>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </Show>
              </div>
            </section>

            <section class="challenge-panel challenge-docs-panel">
              <CheatSheet />
            </section>
          </div>
        )}
        </Show>
      </div>
    </>
  );
};

export default ChallengeDetail;
