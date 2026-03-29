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
import TestPicker from "@/components/TestPicker";
import {
  API_URL,
  challenges,
  cmd,
  currentUser,
  fetchUserChallengeHistory,
  isLoadingHistory,
  isRunning,
  loadChallenges,
  loadHistoricalSubmission,
  runSubmission,
  selectedChallenge,
  selectedTest,
  setCmd,
  setSelectedChallengeId,
  setSelectedTest,
  setSubmission,
  submission,
  userChallengeHistory,
  setUserChallengeHistory,
} from "@/store";
import CheatSheet from "@/components/CheatSheet";
import SiteHeader from "@/components/SiteHeader";

const ChallengeDetail: Component = () => {
  const params = useParams<{ id: string }>();

  const testResults = createMemo(() => submission()?.summary?.results ?? []);

  const currentChallengeHistory = createMemo(() =>
    userChallengeHistory().filter((h) => h.challenge_id === params.id),
  );

  const passSummary = createMemo(() => {
    const summary = submission()?.summary;
    if (!summary) return "No run yet";
    return `${summary.passed}/${summary.total_tests} passed`;
  });

  // Auto-select first test or keep current in sync with new results
  createEffect(() => {
    const tests = testResults();
    const current = selectedTest();

    if (!tests.length) {
      if (current) setSelectedTest(null);
      return;
    }

    if (!current) {
      setSelectedTest(tests[0]);
      return;
    }

    const match = tests.find((test) => test.test_num === current.test_num);
    if (!match) {
      setSelectedTest(tests[0]);
    } else if (match !== current) {
      setSelectedTest(match);
    }
  });

  // Load challenges on first mount
  onMount(() => {
    if (challenges().length === 0) void loadChallenges();
  });

  // Reset state when route changes, then hydrate last command + results.
  createEffect(() => {
    const challengeId = params.id;
    const user = currentUser();

    setSelectedChallengeId(challengeId || "");
    setCmd("");
    setSubmission(null);
    setSelectedTest(null);
    setUserChallengeHistory([]);

    if (!challengeId || !user) return;

    let isCurrent = true;
    void (async () => {
      const history = await fetchUserChallengeHistory(challengeId);

      if (!isCurrent || params.id !== challengeId || history.length === 0) {
        return;
      }

      const latestSubmission = history.reduce((latest, entry) =>
        new Date(entry.created_at) > new Date(latest.created_at) ? entry : latest,
      );

      setCmd(latestSubmission.command);
      await loadHistoricalSubmission(latestSubmission.id);
    })();

    return () => { isCurrent = false; };
  });

  // Update page title
  createEffect(() => {
    document.title = selectedChallenge()?.title ?? "Unix Challenge";
  });

  return (
    <>
      <SiteHeader />

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
                <h3>{challenge().title}</h3>
                <TagsDisplay tags={challenge().tags} />
                <pre id="challenge-description">{challenge().description}</pre>
              </section>

              <Show
                when={currentUser()}
                fallback={
                  <section class="challenge-panel challenge-login-panel">
                    <h3>Login Required</h3>
                    <p>Log in to run commands, view results, and access the cheat sheet.</p>
                    <a href={`${API_URL}/auth/github`} class="challenge-login-link">
                      Login with GitHub
                    </a>
                  </section>
                }
              >
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
                      <label>Test</label>
                      <TestPicker
                        tests={testResults()}
                        selected={selectedTest()}
                        isDisabled={isRunning() || testResults().length === 0}
                        onSelect={setSelectedTest}
                      />
                    </div>
                  </div>

                  <details class="challenge-results-history">
                    <summary class="challenge-results-history-summary">
                      My Previous Submissions
                      <Show when={currentChallengeHistory().length > 0}>
                        {" "}({currentChallengeHistory().length})
                      </Show>
                    </summary>

                    <div class="challenge-results-history-content">
                      <Show when={isLoadingHistory()}>
                        <p class="history-loading">Loading history...</p>
                      </Show>

                      <Show when={!isLoadingHistory() && currentChallengeHistory().length === 0}>
                        <p class="history-empty">No previous submissions for this challenge.</p>
                      </Show>

                      <Show when={!isLoadingHistory() && currentChallengeHistory().length > 0}>
                        <table class="history-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Command</th>
                              <th>Result</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            <For each={currentChallengeHistory()}>
                              {(entry) => (
                                <tr class={entry.all_pass ? "history-row-pass" : "history-row-fail"}>
                                  <td>{new Date(entry.created_at).toLocaleString()}</td>
                                  <td><code class="history-command">{entry.command}</code></td>
                                  <td>
                                    {entry.all_pass ? "✓" : "✗"}{" "}
                                    {entry.passed}/{entry.total_tests} passed
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      class="history-load-btn"
                                      onClick={() => void loadHistoricalSubmission(entry.id)}
                                    >
                                      Load
                                    </button>
                                  </td>
                                </tr>
                              )}
                            </For>
                          </tbody>
                        </table>
                      </Show>
                    </div>
                  </details>

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
                              <td><pre>{test().expected || ""}</pre></td>
                            </tr>
                            <tr>
                              <th scope="row">Stdout</th>
                              <td><pre>{test().stdout || ""}</pre></td>
                            </tr>
                            <tr>
                              <th scope="row">Stderr</th>
                              <td><pre>{test().stderr || ""}</pre></td>
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
              </Show>
            </div>
          )}
        </Show>
      </div>
    </>
  );
};

export default ChallengeDetail;
